package integration

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labring/sealos/service/rauth/pkg/auth"
	"github.com/labring/sealos/service/rauth/pkg/k8s"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"
)

// IntegrationTestSuite holds the test environment
type IntegrationTestSuite struct {
	server     *httptest.Server
	privateKey *rsa.PrivateKey
	clientset  *fake.Clientset
	mux        *http.ServeMux
}

// SetupIntegrationTest creates a full integration test environment
func SetupIntegrationTest(t *testing.T) *IntegrationTestSuite {
	t.Helper()

	// Generate RSA key
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)

	// Create fake K8s clientset
	clientset := fake.NewSimpleClientset()

	// Create token generator
	generator, err := auth.NewTokenGenerator(&auth.TokenOption{
		Issuer:     "rauth-test",
		Service:    "test-registry.io",
		Expiration: 5 * time.Minute,
		PrivateKey: privateKey,
	})
	require.NoError(t, err)

	// Create K8s client wrapper
	k8sClient := &fakeK8sClient{
		clientset:  clientset,
		secretName: "devbox-registry",
	}

	// Create authenticator
	authenticator := auth.NewAuthenticator(k8sClient, generator)

	// Create handler
	handler := &testHandler{
		authenticator: authenticator,
	}

	// Create HTTP mux
	mux := http.NewServeMux()
	mux.HandleFunc("/token", handler.TokenHandler)
	mux.HandleFunc("/health", handler.HealthHandler)
	mux.HandleFunc("/healthz", handler.HealthHandler)

	// Create test server
	server := httptest.NewServer(mux)

	return &IntegrationTestSuite{
		server:     server,
		privateKey: privateKey,
		clientset:  clientset,
		mux:        mux,
	}
}

// Cleanup cleans up test resources
func (s *IntegrationTestSuite) Cleanup() {
	s.server.Close()
}

// CreateNamespaceSecret creates a secret in the fake K8s cluster
func (s *IntegrationTestSuite) CreateNamespaceSecret(
	t *testing.T,
	namespace, username, password string,
) {
	t.Helper()

	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "devbox-registry",
			Namespace: namespace,
		},
		Data: map[string][]byte{
			"username": []byte(username),
			"password": []byte(password),
		},
	}

	_, err := s.clientset.CoreV1().Secrets(namespace).Create(
		context.Background(),
		secret,
		metav1.CreateOptions{},
	)
	require.NoError(t, err)
}

// fakeK8sClient wraps fake clientset
type fakeK8sClient struct {
	clientset  *fake.Clientset
	secretName string
}

func (c *fakeK8sClient) GetNamespaceCredentials(
	ctx context.Context,
	namespace string,
) (*k8s.RegistryCredentials, error) {
	secret, err := c.clientset.CoreV1().
		Secrets(namespace).
		Get(ctx, c.secretName, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}

	return &k8s.RegistryCredentials{
		Username: string(secret.Data["username"]),
		Password: string(secret.Data["password"]),
	}, nil
}

func (c *fakeK8sClient) NamespaceExists(ctx context.Context, namespace string) (bool, error) {
	_, err := c.clientset.CoreV1().Namespaces().Get(ctx, namespace, metav1.GetOptions{})
	return err == nil, nil
}

// testHandler implements HTTP handlers for testing
type testHandler struct {
	authenticator *auth.Authenticator
}

func (h *testHandler) TokenHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	username, password, ok := extractBasicAuth(r)
	if !ok {
		unauthorizedResponse(w, "missing credentials")
		return
	}

	service := r.URL.Query().Get("service")
	scope := r.URL.Query().Get("scope")

	authReq := &auth.AuthRequest{
		Username: username,
		Password: password,
		Service:  service,
		Scope:    scope,
	}

	result := h.authenticator.Authenticate(ctx, authReq)
	if result.Error != nil || !result.Authenticated {
		unauthorizedResponse(w, "authentication failed")
		return
	}

	tokenResp, err := h.authenticator.GenerateToken(result)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		//nolint:errchkjson
		_ = json.NewEncoder(w).Encode(map[string]string{"error": "internal_error"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	//nolint:errchkjson
	_ = json.NewEncoder(w).Encode(tokenResp)
}

func (h *testHandler) HealthHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	//nolint:errchkjson
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

func extractBasicAuth(r *http.Request) (string, string, bool) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" || len(authHeader) < 7 || authHeader[:6] != "Basic " {
		return "", "", false
	}

	decoded, err := base64.StdEncoding.DecodeString(authHeader[6:])
	if err != nil {
		return "", "", false
	}

	for i := range decoded {
		if decoded[i] == ':' {
			return string(decoded[:i]), string(decoded[i+1:]), true
		}
	}

	return "", "", false
}

func unauthorizedResponse(w http.ResponseWriter, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("WWW-Authenticate", `Basic realm="Registry Authentication"`)
	w.WriteHeader(http.StatusUnauthorized)
	//nolint:errchkjson
	_ = json.NewEncoder(w).Encode(map[string]string{
		"error":             "unauthorized",
		"error_description": msg,
	})
}

// basicAuth helper
func basicAuth(username, password string) string {
	return "Basic " + base64.StdEncoding.EncodeToString([]byte(username+":"+password))
}

// TestIntegration_FullAuthenticationFlow tests the complete authentication flow
func TestIntegration_FullAuthenticationFlow(t *testing.T) {
	suite := SetupIntegrationTest(t)
	defer suite.Cleanup()

	// Create namespace secret
	suite.CreateNamespaceSecret(t, "production", "production", "prod-secret-123")

	// Make token request
	client := &http.Client{Timeout: 10 * time.Second}

	req, err := http.NewRequest(
		http.MethodGet,
		suite.server.URL+"/token?service=test-registry.io&scope=repository:production/myapp:pull",
		nil,
	)
	require.NoError(t, err)
	req.Header.Set("Authorization", basicAuth("production", "prod-secret-123"))

	resp, err := client.Do(req)
	require.NoError(t, err)

	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var tokenResp map[string]any

	err = json.NewDecoder(resp.Body).Decode(&tokenResp)
	require.NoError(t, err)

	// Verify token
	tokenString, ok := tokenResp["token"].(string)
	require.True(t, ok)
	assert.NotEmpty(t, tokenString)

	// Parse and validate the JWT token
	token, err := jwt.ParseWithClaims(
		tokenString,
		&auth.Claims{},
		func(token *jwt.Token) (any, error) {
			return &suite.privateKey.PublicKey, nil
		},
	)
	require.NoError(t, err)
	assert.True(t, token.Valid)

	claims, ok := token.Claims.(*auth.Claims)
	require.True(t, ok)
	assert.Equal(t, "rauth-test", claims.Issuer)
	assert.Equal(t, "production", claims.Subject)
	assert.Contains(t, claims.Audience, "test-registry.io")
	require.Len(t, claims.Access, 1)
	assert.Equal(t, "repository", claims.Access[0].Type)
	assert.Equal(t, "production/myapp", claims.Access[0].Name)
	assert.Contains(t, claims.Access[0].Actions, "pull")
}

// TestIntegration_MultiTenantIsolation tests that namespaces are properly isolated
// Note: username must equal namespace for authentication to work
func TestIntegration_MultiTenantIsolation(t *testing.T) {
	suite := SetupIntegrationTest(t)
	defer suite.Cleanup()

	// Create multiple namespace secrets (username == namespace)
	suite.CreateNamespaceSecret(t, "team-alpha", "team-alpha", "alpha-pass")
	suite.CreateNamespaceSecret(t, "team-beta", "team-beta", "beta-pass")
	suite.CreateNamespaceSecret(t, "team-gamma", "team-gamma", "gamma-pass")

	client := &http.Client{Timeout: 10 * time.Second}

	testCases := []struct {
		name           string
		username       string
		password       string
		targetNS       string
		expectedStatus int
	}{
		// Valid access - same namespace
		{
			name:           "alpha accessing alpha",
			username:       "team-alpha",
			password:       "alpha-pass",
			targetNS:       "team-alpha",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "beta accessing beta",
			username:       "team-beta",
			password:       "beta-pass",
			targetNS:       "team-beta",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "gamma accessing gamma",
			username:       "team-gamma",
			password:       "gamma-pass",
			targetNS:       "team-gamma",
			expectedStatus: http.StatusOK,
		},
		// Invalid access - cross namespace
		{
			name:           "alpha trying to access beta",
			username:       "team-alpha",
			password:       "alpha-pass",
			targetNS:       "team-beta",
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name:           "beta trying to access gamma",
			username:       "team-beta",
			password:       "beta-pass",
			targetNS:       "team-gamma",
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name:           "gamma trying to access alpha",
			username:       "team-gamma",
			password:       "gamma-pass",
			targetNS:       "team-alpha",
			expectedStatus: http.StatusUnauthorized,
		},
		// Wrong credentials
		{
			name:           "wrong password for alpha",
			username:       "team-alpha",
			password:       "wrong-pass",
			targetNS:       "team-alpha",
			expectedStatus: http.StatusUnauthorized,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, err := http.NewRequest(
				http.MethodGet,
				fmt.Sprintf(
					"%s/token?service=test-registry.io&scope=repository:%s/app:pull",
					suite.server.URL,
					tc.targetNS,
				),
				nil,
			)
			require.NoError(t, err)
			req.Header.Set("Authorization", basicAuth(tc.username, tc.password))

			resp, err := client.Do(req)
			require.NoError(t, err)

			defer resp.Body.Close()

			assert.Equal(t, tc.expectedStatus, resp.StatusCode)
		})
	}
}

// TestIntegration_TokenExpiration tests that tokens have correct expiration
// Note: username must equal namespace for authentication to work
func TestIntegration_TokenExpiration(t *testing.T) {
	suite := SetupIntegrationTest(t)
	defer suite.Cleanup()

	suite.CreateNamespaceSecret(t, "test-ns", "test-ns", "test-pass")

	client := &http.Client{Timeout: 10 * time.Second}

	req, err := http.NewRequest(
		http.MethodGet,
		suite.server.URL+"/token?service=test-registry.io&scope=repository:test-ns/app:pull",
		nil,
	)
	require.NoError(t, err)
	req.Header.Set("Authorization", basicAuth("test-ns", "test-pass"))

	beforeRequest := time.Now()
	resp, err := client.Do(req)
	require.NoError(t, err)

	defer resp.Body.Close()

	var tokenResp map[string]any

	err = json.NewDecoder(resp.Body).Decode(&tokenResp)
	require.NoError(t, err)

	tokenString, ok := tokenResp["token"].(string)
	require.True(t, ok)

	token, err := jwt.ParseWithClaims(
		tokenString,
		&auth.Claims{},
		func(token *jwt.Token) (any, error) {
			return &suite.privateKey.PublicKey, nil
		},
	)
	require.NoError(t, err)

	claims, ok := token.Claims.(*auth.Claims)
	require.True(t, ok)

	// Verify expiration is ~5 minutes from now
	expectedExpiry := beforeRequest.Add(5 * time.Minute)
	assert.WithinDuration(t, expectedExpiry, claims.ExpiresAt.Time, 5*time.Second)

	// Verify not before is approximately now
	assert.WithinDuration(t, beforeRequest, claims.NotBefore.Time, 5*time.Second)

	// Verify issued at is approximately now
	assert.WithinDuration(t, beforeRequest, claims.IssuedAt.Time, 5*time.Second)
}

// TestIntegration_HealthEndpoints tests health check endpoints
func TestIntegration_HealthEndpoints(t *testing.T) {
	suite := SetupIntegrationTest(t)
	defer suite.Cleanup()

	client := &http.Client{Timeout: 10 * time.Second}

	endpoints := []string{"/health", "/healthz"}

	for _, endpoint := range endpoints {
		t.Run(endpoint, func(t *testing.T) {
			resp, err := client.Get(suite.server.URL + endpoint)
			require.NoError(t, err)

			defer resp.Body.Close()

			assert.Equal(t, http.StatusOK, resp.StatusCode)
			assert.Equal(t, "application/json", resp.Header.Get("Content-Type"))

			var health map[string]string

			err = json.NewDecoder(resp.Body).Decode(&health)
			require.NoError(t, err)
			assert.Equal(t, "healthy", health["status"])
		})
	}
}

// TestIntegration_PullAndPushActions tests different action permissions
// Note: username must equal namespace for authentication to work
func TestIntegration_PullAndPushActions(t *testing.T) {
	suite := SetupIntegrationTest(t)
	defer suite.Cleanup()

	suite.CreateNamespaceSecret(t, "dev", "dev", "dev-pass")

	client := &http.Client{Timeout: 10 * time.Second}

	testCases := []struct {
		name    string
		scope   string
		actions []string
	}{
		{
			name:    "pull only",
			scope:   "repository:dev/app:pull",
			actions: []string{"pull"},
		},
		{
			name:    "push only",
			scope:   "repository:dev/app:push",
			actions: []string{"push"},
		},
		{
			name:    "pull and push",
			scope:   "repository:dev/app:pull,push",
			actions: []string{"pull", "push"},
		},
		{
			name:    "all actions",
			scope:   "repository:dev/app:pull,push,delete",
			actions: []string{"pull", "push", "delete"},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, err := http.NewRequest(
				http.MethodGet,
				fmt.Sprintf(
					"%s/token?service=test-registry.io&scope=%s",
					suite.server.URL,
					tc.scope,
				),
				nil,
			)
			require.NoError(t, err)
			req.Header.Set("Authorization", basicAuth("dev", "dev-pass"))

			resp, err := client.Do(req)
			require.NoError(t, err)

			defer resp.Body.Close()

			assert.Equal(t, http.StatusOK, resp.StatusCode)

			var tokenResp map[string]any

			err = json.NewDecoder(resp.Body).Decode(&tokenResp)
			require.NoError(t, err)

			tokenString, ok := tokenResp["token"].(string)
			require.True(t, ok)

			token, err := jwt.ParseWithClaims(
				tokenString,
				&auth.Claims{},
				func(token *jwt.Token) (any, error) {
					return &suite.privateKey.PublicKey, nil
				},
			)
			require.NoError(t, err)

			claims, ok := token.Claims.(*auth.Claims)
			require.True(t, ok)
			require.Len(t, claims.Access, 1)
			assert.Equal(t, tc.actions, claims.Access[0].Actions)
		})
	}
}

// TestIntegration_NestedImagePaths tests nested image paths
func TestIntegration_NestedImagePaths(t *testing.T) {
	suite := SetupIntegrationTest(t)
	defer suite.Cleanup()

	suite.CreateNamespaceSecret(t, "myteam", "myteam", "secret")

	client := &http.Client{Timeout: 10 * time.Second}

	testCases := []struct {
		name      string
		imagePath string
	}{
		{
			name:      "single level",
			imagePath: "myteam/app",
		},
		{
			name:      "two levels",
			imagePath: "myteam/sub/app",
		},
		{
			name:      "three levels",
			imagePath: "myteam/a/b/c/app",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			req, err := http.NewRequest(
				http.MethodGet,
				fmt.Sprintf(
					"%s/token?service=test-registry.io&scope=repository:%s:pull",
					suite.server.URL,
					tc.imagePath,
				),
				nil,
			)
			require.NoError(t, err)
			req.Header.Set("Authorization", basicAuth("myteam", "secret"))

			resp, err := client.Do(req)
			require.NoError(t, err)

			defer resp.Body.Close()

			assert.Equal(t, http.StatusOK, resp.StatusCode)

			var tokenResp map[string]any

			err = json.NewDecoder(resp.Body).Decode(&tokenResp)
			require.NoError(t, err)

			tokenString, ok := tokenResp["token"].(string)
			require.True(t, ok)

			token, err := jwt.ParseWithClaims(
				tokenString,
				&auth.Claims{},
				func(token *jwt.Token) (any, error) {
					return &suite.privateKey.PublicKey, nil
				},
			)
			require.NoError(t, err)

			claims, ok := token.Claims.(*auth.Claims)
			require.True(t, ok)
			require.Len(t, claims.Access, 1)
			assert.Equal(t, tc.imagePath, claims.Access[0].Name)
		})
	}
}

// TestIntegration_EmptyScope tests requests without scope
func TestIntegration_EmptyScope(t *testing.T) {
	suite := SetupIntegrationTest(t)
	defer suite.Cleanup()

	suite.CreateNamespaceSecret(t, "test", "test", "test")

	client := &http.Client{Timeout: 10 * time.Second}

	req, err := http.NewRequest(
		http.MethodGet,
		suite.server.URL+"/token?service=test-registry.io",
		nil,
	)
	require.NoError(t, err)
	req.Header.Set("Authorization", basicAuth("test", "test"))

	resp, err := client.Do(req)
	require.NoError(t, err)

	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var tokenResp map[string]any

	err = json.NewDecoder(resp.Body).Decode(&tokenResp)
	require.NoError(t, err)

	tokenString, ok := tokenResp["token"].(string)
	require.True(t, ok)

	token, err := jwt.ParseWithClaims(
		tokenString,
		&auth.Claims{},
		func(token *jwt.Token) (any, error) {
			return &suite.privateKey.PublicKey, nil
		},
	)
	require.NoError(t, err)

	claims, ok := token.Claims.(*auth.Claims)
	require.True(t, ok)
	assert.Empty(t, claims.Access)
}

// TestIntegration_ConcurrentMultiTenant tests concurrent requests from different tenants
func TestIntegration_ConcurrentMultiTenant(t *testing.T) {
	suite := SetupIntegrationTest(t)
	defer suite.Cleanup()

	// Create many namespace secrets (username == namespace)
	numTenants := 10
	for i := range numTenants {
		ns := fmt.Sprintf("tenant-%d", i)
		suite.CreateNamespaceSecret(t, ns, ns, ns+"-pass")
	}

	client := &http.Client{Timeout: 10 * time.Second}

	// Run concurrent requests
	results := make(chan error, numTenants*5)

	for i := range numTenants {
		for range 5 {
			go func(tenantID int) {
				ns := fmt.Sprintf("tenant-%d", tenantID)

				req, err := http.NewRequest(
					http.MethodGet,
					fmt.Sprintf(
						"%s/token?service=test-registry.io&scope=repository:%s/app:pull",
						suite.server.URL,
						ns,
					),
					nil,
				)
				if err != nil {
					results <- err
					return
				}

				req.Header.Set("Authorization", basicAuth(ns, ns+"-pass"))

				resp, err := client.Do(req)
				if err != nil {
					results <- err
					return
				}
				defer resp.Body.Close()

				if resp.StatusCode != http.StatusOK {
					results <- fmt.Errorf("unexpected status %d for tenant %d", resp.StatusCode, tenantID)
					return
				}

				results <- nil
			}(i)
		}
	}

	// Collect results
	for range numTenants * 5 {
		err := <-results
		assert.NoError(t, err)
	}
}

// TestIntegration_TokenUniqueness tests that each token is unique
func TestIntegration_TokenUniqueness(t *testing.T) {
	suite := SetupIntegrationTest(t)
	defer suite.Cleanup()

	suite.CreateNamespaceSecret(t, "test", "test", "test")

	client := &http.Client{Timeout: 10 * time.Second}

	tokens := make(map[string]bool)

	for range 100 {
		req, err := http.NewRequest(
			http.MethodGet,
			suite.server.URL+"/token?service=test-registry.io&scope=repository:test/app:pull",
			nil,
		)
		require.NoError(t, err)
		req.Header.Set("Authorization", basicAuth("test", "test"))

		resp, err := client.Do(req)
		require.NoError(t, err)

		var tokenResp map[string]any

		err = json.NewDecoder(resp.Body).Decode(&tokenResp)
		resp.Body.Close()
		require.NoError(t, err)

		tokenString, ok := tokenResp["token"].(string)
		require.True(t, ok)

		// Each token should be unique (due to unique JTI)
		assert.False(t, tokens[tokenString], "Token should be unique")
		tokens[tokenString] = true
	}
}
