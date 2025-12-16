package auth_test

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"testing"
	"time"

	"github.com/distribution/distribution/v3/registry/auth/token"
	"github.com/labring/sealos/service/rauth/pkg/auth"
	"github.com/labring/sealos/service/rauth/pkg/k8s"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"
)

// setupTestAuthenticator creates an authenticator for testing
func setupTestAuthenticator(t *testing.T, secrets ...*corev1.Secret) *auth.Authenticator {
	t.Helper()

	var fakeClientset *fake.Clientset
	if len(secrets) == 0 {
		fakeClientset = fake.NewSimpleClientset()
	} else {
		fakeClientset = fake.NewSimpleClientset(secrets[0])
		for _, secret := range secrets[1:] {
			_, _ = fakeClientset.CoreV1().Secrets(secret.Namespace).Create(
				context.Background(), secret, metav1.CreateOptions{})
		}
	}

	k8sClient := k8s.NewClientWithInterface(fakeClientset, "", "registry.io")

	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)

	generator, err := auth.NewTokenGenerator(&auth.TokenOption{
		Issuer:     "test-issuer",
		Service:    "test-service",
		Expiration: 5 * time.Minute,
		PrivateKey: privateKey,
	})
	require.NoError(t, err)

	return auth.NewAuthenticator(k8sClient, generator)
}

// createTestSecret creates a test secret
func createSecret(namespace, username, password string) *corev1.Secret {
	return &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      k8s.DefaultSecretName,
			Namespace: namespace,
		},
		Data: map[string][]byte{
			"username": []byte(username),
			"password": []byte(password),
		},
	}
}

// TestAuthenticate_Success tests successful authentication
func TestAuthenticate_Success(t *testing.T) {
	secret := createSecret("team-a", "team-a", "secret-password")
	authenticator := setupTestAuthenticator(t, secret)

	ctx := context.Background()
	result := authenticator.Authenticate(ctx, &auth.AuthRequest{
		Username: "team-a",
		Password: "secret-password",
		Service:  "test-registry",
		Scope:    "repository:team-a/myapp:pull",
	})

	assert.NoError(t, result.Error)
	assert.True(t, result.Authenticated)
	assert.Equal(t, "team-a", result.Subject)
	require.Len(t, result.Access, 1)
	assert.Equal(t, "repository", result.Access[0].Type)
	assert.Equal(t, "team-a/myapp", result.Access[0].Name)
}

// TestAuthenticate_InvalidPassword tests authentication with wrong password
func TestAuthenticate_InvalidPassword(t *testing.T) {
	secret := createSecret("team-a", "team-a", "correct-password")
	authenticator := setupTestAuthenticator(t, secret)

	ctx := context.Background()
	result := authenticator.Authenticate(ctx, &auth.AuthRequest{
		Username: "team-a",
		Password: "wrong-password",
		Scope:    "repository:team-a/myapp:pull",
	})

	assert.Error(t, result.Error)
	assert.False(t, result.Authenticated)
}

// TestAuthenticate_InvalidUsername tests authentication with wrong username
func TestAuthenticate_InvalidUsername(t *testing.T) {
	secret := createSecret("team-a", "team-a", "secret-password")
	authenticator := setupTestAuthenticator(t, secret)

	ctx := context.Background()
	result := authenticator.Authenticate(ctx, &auth.AuthRequest{
		Username: "wrong-user",
		Password: "secret-password",
		Scope:    "repository:team-a/myapp:pull",
	})

	assert.Error(t, result.Error)
	assert.False(t, result.Authenticated)
}

// TestAuthenticate_NamespaceNotFound tests when namespace doesn't exist
func TestAuthenticate_NamespaceNotFound(t *testing.T) {
	authenticator := setupTestAuthenticator(t) // No secrets

	ctx := context.Background()
	result := authenticator.Authenticate(ctx, &auth.AuthRequest{
		Username: "team-a",
		Password: "secret-password",
		Scope:    "repository:team-a/myapp:pull",
	})

	assert.Error(t, result.Error)
	assert.False(t, result.Authenticated)
}

// TestAuthenticate_CrossNamespaceAccess tests namespace isolation
func TestAuthenticate_CrossNamespaceAccess(t *testing.T) {
	secretA := createSecret("team-a", "team-a", "pass-a")
	secretB := createSecret("team-b", "team-b", "pass-b")
	authenticator := setupTestAuthenticator(t, secretA, secretB)

	ctx := context.Background()

	// Team-A user trying to access Team-B's image
	result := authenticator.Authenticate(ctx, &auth.AuthRequest{
		Username: "team-a",
		Password: "pass-a",
		Scope:    "repository:team-b/myapp:pull",
	})

	// Authentication succeeds (credentials are valid)
	// But authorization fails (can't access team-b's repo)
	assert.True(t, result.Authenticated)
	assert.Error(t, result.Error)
	assert.Empty(t, result.Access)
}

// TestAuthenticate_EmptyScope tests authentication with empty scope
func TestAuthenticate_EmptyScope(t *testing.T) {
	secret := createSecret("team-a", "team-a", "secret-password")
	authenticator := setupTestAuthenticator(t, secret)

	ctx := context.Background()
	result := authenticator.Authenticate(ctx, &auth.AuthRequest{
		Username: "team-a",
		Password: "secret-password",
		Scope:    "",
	})

	assert.NoError(t, result.Error)
	assert.True(t, result.Authenticated)
	assert.Empty(t, result.Access)
}

// TestAuthenticate_InvalidScope tests authentication with invalid scope
func TestAuthenticate_InvalidScope(t *testing.T) {
	secret := createSecret("team-a", "team-a", "secret-password")
	authenticator := setupTestAuthenticator(t, secret)

	ctx := context.Background()
	result := authenticator.Authenticate(ctx, &auth.AuthRequest{
		Username: "team-a",
		Password: "secret-password",
		Scope:    "invalid-scope-format",
	})

	assert.Error(t, result.Error)
}

// TestAuthenticate_PullAndPush tests pull and push access
func TestAuthenticate_PullAndPush(t *testing.T) {
	secret := createSecret("team-a", "team-a", "secret-password")
	authenticator := setupTestAuthenticator(t, secret)

	ctx := context.Background()
	result := authenticator.Authenticate(ctx, &auth.AuthRequest{
		Username: "team-a",
		Password: "secret-password",
		Scope:    "repository:team-a/myapp:pull,push",
	})

	assert.NoError(t, result.Error)
	assert.True(t, result.Authenticated)
	require.Len(t, result.Access, 1)
	assert.Contains(t, result.Access[0].Actions, "pull")
	assert.Contains(t, result.Access[0].Actions, "push")
}

// TestAuthenticate_NestedImagePath tests nested image paths
func TestAuthenticate_NestedImagePath(t *testing.T) {
	secret := createSecret("team-a", "team-a", "secret-password")
	authenticator := setupTestAuthenticator(t, secret)

	ctx := context.Background()
	result := authenticator.Authenticate(ctx, &auth.AuthRequest{
		Username: "team-a",
		Password: "secret-password",
		Scope:    "repository:team-a/sub/path/myapp:pull",
	})

	assert.NoError(t, result.Error)
	assert.True(t, result.Authenticated)
	require.Len(t, result.Access, 1)
	assert.Equal(t, "team-a/sub/path/myapp", result.Access[0].Name)
}

// TestAuthenticate_MultipleNamespaces tests multiple namespaces isolation
func TestAuthenticate_MultipleNamespaces(t *testing.T) {
	secrets := []*corev1.Secret{
		createSecret("ns-1", "ns-1", "pass-1"),
		createSecret("ns-2", "ns-2", "pass-2"),
		createSecret("ns-3", "ns-3", "pass-3"),
	}
	authenticator := setupTestAuthenticator(t, secrets...)

	ctx := context.Background()

	testCases := []struct {
		name       string
		username   string
		password   string
		scope      string
		wantAuth   bool
		wantAccess bool
	}{
		{"ns-1 user accessing ns-1", "ns-1", "pass-1", "repository:ns-1/image:pull", true, true},
		{"ns-2 user accessing ns-2", "ns-2", "pass-2", "repository:ns-2/image:pull", true, true},
		{"ns-1 user accessing ns-2", "ns-1", "pass-1", "repository:ns-2/image:pull", true, false},
		{"ns-3 user accessing ns-1", "ns-3", "pass-3", "repository:ns-1/image:pull", true, false},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := authenticator.Authenticate(ctx, &auth.AuthRequest{
				Username: tc.username,
				Password: tc.password,
				Scope:    tc.scope,
			})

			assert.Equal(t, tc.wantAuth, result.Authenticated)
			assert.Equal(t, tc.wantAccess, len(result.Access) > 0)
		})
	}
}

// TestGenerateToken_Success tests token generation from auth result
func TestGenerateToken_Success(t *testing.T) {
	secret := createSecret("team-a", "team-a", "secret-password")
	authenticator := setupTestAuthenticator(t, secret)

	ctx := context.Background()
	result := authenticator.Authenticate(ctx, &auth.AuthRequest{
		Username: "team-a",
		Password: "secret-password",
		Scope:    "repository:team-a/myapp:pull",
	})

	require.True(t, result.Authenticated)

	tokenResp, err := authenticator.GenerateToken(result)
	require.NoError(t, err)
	assert.NotEmpty(t, tokenResp.Token)
	assert.NotEmpty(t, tokenResp.AccessToken)
	assert.Equal(t, 300, tokenResp.ExpiresIn)
}

// TestGenerateToken_NotAuthenticated tests token generation for unauthenticated user
func TestGenerateToken_NotAuthenticated(t *testing.T) {
	authenticator := setupTestAuthenticator(t)

	result := &auth.AuthResult{
		Authenticated: false,
	}

	_, err := authenticator.GenerateToken(result)
	assert.Error(t, err)
}

// TestAuthRequest_Fields tests AuthRequest struct
func TestAuthRequest_Fields(t *testing.T) {
	req := &auth.AuthRequest{
		Username: "user",
		Password: "pass",
		Service:  "registry",
		Scope:    "repository:ns/image:pull",
		ClientID: "client-123",
	}

	assert.Equal(t, "user", req.Username)
	assert.Equal(t, "pass", req.Password)
	assert.Equal(t, "registry", req.Service)
	assert.Equal(t, "repository:ns/image:pull", req.Scope)
	assert.Equal(t, "client-123", req.ClientID)
}

// TestAuthResult_Fields tests AuthResult struct
func TestAuthResult_Fields(t *testing.T) {
	result := &auth.AuthResult{
		Authenticated: true,
		Subject:       "user",
		Access: []*token.ResourceActions{
			{Type: "repository", Name: "ns/img", Actions: []string{"pull"}},
		},
		Error: nil,
	}

	assert.True(t, result.Authenticated)
	assert.Equal(t, "user", result.Subject)
	assert.Len(t, result.Access, 1)
	assert.Nil(t, result.Error)
}

// TestAuthenticate_AdminUser tests global admin authentication
func TestAuthenticate_AdminUser(t *testing.T) {
	authenticator := setupTestAuthenticator(t)
	authenticator.SetAdminCredentials("admin", "admin-secret")

	ctx := context.Background()
	result := authenticator.Authenticate(ctx, &auth.AuthRequest{
		Username: "admin",
		Password: "admin-secret",
		Scope:    "repository:any-namespace/myapp:pull,push",
	})

	assert.NoError(t, result.Error)
	assert.True(t, result.Authenticated)
	assert.Equal(t, "admin", result.Subject)
	require.Len(t, result.Access, 1)
	assert.Equal(t, "any-namespace/myapp", result.Access[0].Name)
	assert.Contains(t, result.Access[0].Actions, "pull")
	assert.Contains(t, result.Access[0].Actions, "push")
}

// TestAuthenticate_AdminAccessAllNamespaces tests admin can access any namespace
func TestAuthenticate_AdminAccessAllNamespaces(t *testing.T) {
	secrets := []*corev1.Secret{
		createSecret("ns-1", "ns-1", "pass-1"),
		createSecret("ns-2", "ns-2", "pass-2"),
	}
	authenticator := setupTestAuthenticator(t, secrets...)
	authenticator.SetAdminCredentials("superadmin", "superpass")

	ctx := context.Background()

	// Admin can access ns-1
	result1 := authenticator.Authenticate(ctx, &auth.AuthRequest{
		Username: "superadmin",
		Password: "superpass",
		Scope:    "repository:ns-1/image:pull",
	})
	assert.NoError(t, result1.Error)
	assert.True(t, result1.Authenticated)
	require.Len(t, result1.Access, 1)
	assert.Equal(t, "ns-1/image", result1.Access[0].Name)

	// Admin can access ns-2
	result2 := authenticator.Authenticate(ctx, &auth.AuthRequest{
		Username: "superadmin",
		Password: "superpass",
		Scope:    "repository:ns-2/image:push",
	})
	assert.NoError(t, result2.Error)
	assert.True(t, result2.Authenticated)
	require.Len(t, result2.Access, 1)
	assert.Equal(t, "ns-2/image", result2.Access[0].Name)

	// Admin can access non-existent namespace (just authorization, no k8s lookup)
	result3 := authenticator.Authenticate(ctx, &auth.AuthRequest{
		Username: "superadmin",
		Password: "superpass",
		Scope:    "repository:non-existent/image:pull",
	})
	assert.NoError(t, result3.Error)
	assert.True(t, result3.Authenticated)
	require.Len(t, result3.Access, 1)
}

// TestAuthenticate_AdminWrongPassword tests admin with wrong password
func TestAuthenticate_AdminWrongPassword(t *testing.T) {
	authenticator := setupTestAuthenticator(t)
	authenticator.SetAdminCredentials("admin", "correct-password")

	ctx := context.Background()
	result := authenticator.Authenticate(ctx, &auth.AuthRequest{
		Username: "admin",
		Password: "wrong-password",
		Scope:    "repository:any-ns/app:pull",
	})

	// Should fail because admin password is wrong and "admin" namespace doesn't exist
	assert.Error(t, result.Error)
	assert.False(t, result.Authenticated)
}

// TestAuthenticate_NoAdminConfigured tests when admin is not configured
func TestAuthenticate_NoAdminConfigured(t *testing.T) {
	secret := createSecret("team-a", "team-a", "pass")
	authenticator := setupTestAuthenticator(t, secret)
	// No admin credentials set

	ctx := context.Background()

	// Regular user works normally
	result := authenticator.Authenticate(ctx, &auth.AuthRequest{
		Username: "team-a",
		Password: "pass",
		Scope:    "repository:team-a/app:pull",
	})
	assert.NoError(t, result.Error)
	assert.True(t, result.Authenticated)

	// Trying to use "admin" as username fails (no such namespace)
	result2 := authenticator.Authenticate(ctx, &auth.AuthRequest{
		Username: "admin",
		Password: "anything",
		Scope:    "repository:team-a/app:pull",
	})
	assert.Error(t, result2.Error)
	assert.False(t, result2.Authenticated)
}
