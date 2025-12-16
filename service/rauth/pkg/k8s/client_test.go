package k8s_test

import (
	"context"
	"encoding/base64"
	"fmt"
	"testing"

	"github.com/labring/sealos/service/rauth/pkg/k8s"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"
)

// createTestSecret creates a test secret for testing (Opaque type)
func createTestSecret(namespace, secretName, username, password string) *corev1.Secret {
	return &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      secretName,
			Namespace: namespace,
		},
		Data: map[string][]byte{
			"username": []byte(username),
			"password": []byte(password),
		},
	}
}

// createDockerConfigJSONSecret creates a kubernetes.io/dockerconfigjson type secret
func createDockerConfigJSONSecret(
	namespace, secretName, registry, username, password string,
) *corev1.Secret {
	authStr := base64.StdEncoding.EncodeToString([]byte(username + ":" + password))
	dockerConfig := fmt.Sprintf(`{"auths":{"%s":{"username":"%s","password":"%s","auth":"%s"}}}`,
		registry, username, password, authStr)

	return &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      secretName,
			Namespace: namespace,
		},
		Type: corev1.SecretTypeDockerConfigJson,
		Data: map[string][]byte{
			corev1.DockerConfigJsonKey: []byte(dockerConfig),
		},
	}
}

// createDockerConfigJSONSecretAuthOnly creates a secret with only auth field (no username/password)
func createDockerConfigJSONSecretAuthOnly(
	namespace, secretName, registry, username, password string,
) *corev1.Secret {
	authStr := base64.StdEncoding.EncodeToString([]byte(username + ":" + password))
	dockerConfig := fmt.Sprintf(`{"auths":{"%s":{"auth":"%s"}}}`, registry, authStr)

	return &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      secretName,
			Namespace: namespace,
		},
		Type: corev1.SecretTypeDockerConfigJson,
		Data: map[string][]byte{
			corev1.DockerConfigJsonKey: []byte(dockerConfig),
		},
	}
}

// TestNewClientWithInterface tests creating a client with a fake kubernetes interface
func TestNewClientWithInterface(t *testing.T) {
	fakeClientset := fake.NewSimpleClientset()
	client := k8s.NewClientWithInterface(fakeClientset, "", "registry.io")

	assert.NotNil(t, client)
	assert.Equal(t, k8s.DefaultSecretName, client.GetSecretName())
}

// TestNewClientWithInterface_CustomSecretName tests custom secret name
func TestNewClientWithInterface_CustomSecretName(t *testing.T) {
	fakeClientset := fake.NewSimpleClientset()
	client := k8s.NewClientWithInterface(fakeClientset, "custom-secret", "registry.io")

	assert.Equal(t, "custom-secret", client.GetSecretName())
}

// TestGetNamespaceCredentials_Success tests successful credential retrieval
func TestGetNamespaceCredentials_Success(t *testing.T) {
	secret := createTestSecret("test-ns", k8s.DefaultSecretName, "test-user", "test-pass")
	fakeClientset := fake.NewSimpleClientset(secret)
	client := k8s.NewClientWithInterface(fakeClientset, "", "registry.io")

	ctx := context.Background()
	creds, err := client.GetNamespaceCredentials(ctx, "test-ns")

	require.NoError(t, err)
	assert.Equal(t, "test-user", creds.Username)
	assert.Equal(t, "test-pass", creds.Password)
}

// TestGetNamespaceCredentials_SecretNotFound tests when secret doesn't exist
func TestGetNamespaceCredentials_SecretNotFound(t *testing.T) {
	fakeClientset := fake.NewSimpleClientset()
	client := k8s.NewClientWithInterface(fakeClientset, "", "registry.io")

	ctx := context.Background()
	_, err := client.GetNamespaceCredentials(ctx, "non-existent")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not found")
}

// TestGetNamespaceCredentials_MultipleNamespaces tests accessing different namespaces
func TestGetNamespaceCredentials_MultipleNamespaces(t *testing.T) {
	secret1 := createTestSecret("ns-a", k8s.DefaultSecretName, "user-a", "pass-a")
	secret2 := createTestSecret("ns-b", k8s.DefaultSecretName, "user-b", "pass-b")

	fakeClientset := fake.NewSimpleClientset(secret1, secret2)
	client := k8s.NewClientWithInterface(fakeClientset, "", "registry.io")

	ctx := context.Background()

	// Test ns-a
	credsA, err := client.GetNamespaceCredentials(ctx, "ns-a")
	require.NoError(t, err)
	assert.Equal(t, "user-a", credsA.Username)
	assert.Equal(t, "pass-a", credsA.Password)

	// Test ns-b
	credsB, err := client.GetNamespaceCredentials(ctx, "ns-b")
	require.NoError(t, err)
	assert.Equal(t, "user-b", credsB.Username)
	assert.Equal(t, "pass-b", credsB.Password)

	// Test non-existent
	_, err = client.GetNamespaceCredentials(ctx, "ns-c")
	assert.Error(t, err)
}

// TestGetNamespaceCredentials_CustomSecretName tests using custom secret name
func TestGetNamespaceCredentials_CustomSecretName(t *testing.T) {
	secret := createTestSecret("test-ns", "my-custom-secret", "user", "pass")
	fakeClientset := fake.NewSimpleClientset(secret)
	client := k8s.NewClientWithInterface(fakeClientset, "my-custom-secret", "registry.io")

	ctx := context.Background()
	creds, err := client.GetNamespaceCredentials(ctx, "test-ns")

	require.NoError(t, err)
	assert.Equal(t, "user", creds.Username)
	assert.Equal(t, "pass", creds.Password)
}

// TestNamespaceExists tests checking namespace existence
func TestNamespaceExists(t *testing.T) {
	ns := &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{Name: "existing-ns"},
	}
	fakeClientset := fake.NewSimpleClientset(ns)
	client := k8s.NewClientWithInterface(fakeClientset, "", "registry.io")

	ctx := context.Background()

	exists, err := client.NamespaceExists(ctx, "existing-ns")
	require.NoError(t, err)
	assert.True(t, exists)

	exists, err = client.NamespaceExists(ctx, "non-existing-ns")
	require.NoError(t, err)
	assert.False(t, exists)
}

// TestExtractCredentials tests the ExtractCredentials function
func TestExtractCredentials(t *testing.T) {
	tests := []struct {
		name         string
		secret       *corev1.Secret
		registryHost string
		wantUser     string
		wantPass     string
		wantErr      bool
		errContains  string
	}{
		{
			name: "valid secret",
			secret: &corev1.Secret{
				Data: map[string][]byte{
					"username": []byte("myuser"),
					"password": []byte("mypass"),
				},
			},
			registryHost: "registry.example.com",
			wantUser:     "myuser",
			wantPass:     "mypass",
		},
		{
			name: "special characters",
			secret: &corev1.Secret{
				Data: map[string][]byte{
					"username": []byte("user@domain.com"),
					"password": []byte("p@ss!w0rd#$%"),
				},
			},
			registryHost: "registry.example.com",
			wantUser:     "user@domain.com",
			wantPass:     "p@ss!w0rd#$%",
		},
		{
			name: "unicode characters",
			secret: &corev1.Secret{
				Data: map[string][]byte{
					"username": []byte("用户"),
					"password": []byte("密码"),
				},
			},
			registryHost: "registry.example.com",
			wantUser:     "用户",
			wantPass:     "密码",
		},
		{
			name: "missing username",
			secret: &corev1.Secret{
				Data: map[string][]byte{
					"password": []byte("pass"),
				},
			},
			registryHost: "registry.example.com",
			wantErr:      true,
			errContains:  "username",
		},
		{
			name: "missing password",
			secret: &corev1.Secret{
				Data: map[string][]byte{
					"username": []byte("user"),
				},
			},
			registryHost: "registry.example.com",
			wantErr:      true,
			errContains:  "password",
		},
		{
			name: "nil data",
			secret: &corev1.Secret{
				Data: nil,
			},
			registryHost: "registry.example.com",
			wantErr:      true,
			errContains:  "username",
		},
		// dockerconfigjson format tests
		{
			name: "dockerconfigjson with username and password",
			secret: &corev1.Secret{
				Type: corev1.SecretTypeDockerConfigJson,
				Data: map[string][]byte{
					corev1.DockerConfigJsonKey: []byte(
						`{"auths":{"registry.example.com":{"username":"docker-user","password":"docker-pass","auth":"ZG9ja2VyLXVzZXI6ZG9ja2VyLXBhc3M="}}}`,
					),
				},
			},
			registryHost: "registry.example.com",
			wantUser:     "docker-user",
			wantPass:     "docker-pass",
		},
		{
			name: "dockerconfigjson with auth only",
			secret: &corev1.Secret{
				Type: corev1.SecretTypeDockerConfigJson,
				Data: map[string][]byte{
					corev1.DockerConfigJsonKey: []byte(
						`{"auths":{"registry.example.com":{"auth":"YXV0aC11c2VyOmF1dGgtcGFzcw=="}}}`,
					),
				},
			},
			registryHost: "registry.example.com",
			wantUser:     "auth-user",
			wantPass:     "auth-pass",
		},
		{
			name: "dockerconfigjson with special characters in password",
			secret: &corev1.Secret{
				Type: corev1.SecretTypeDockerConfigJson,
				Data: map[string][]byte{
					corev1.DockerConfigJsonKey: []byte(
						`{"auths":{"registry.example.com":{"username":"user","password":"p@ss:word!","auth":"dXNlcjpwQHNzOndvcmQh"}}}`,
					),
				},
			},
			registryHost: "registry.example.com",
			wantUser:     "user",
			wantPass:     "p@ss:word!",
		},
		{
			name: "dockerconfigjson missing .dockerconfigjson key",
			secret: &corev1.Secret{
				Type: corev1.SecretTypeDockerConfigJson,
				Data: map[string][]byte{},
			},
			registryHost: "registry.example.com",
			wantErr:      true,
			errContains:  ".dockerconfigjson",
		},
		{
			name: "dockerconfigjson empty auths",
			secret: &corev1.Secret{
				Type: corev1.SecretTypeDockerConfigJson,
				Data: map[string][]byte{
					corev1.DockerConfigJsonKey: []byte(`{"auths":{}}`),
				},
			},
			registryHost: "registry.example.com",
			wantErr:      true,
			errContains:  "no auth entries",
		},
		{
			name: "dockerconfigjson invalid json",
			secret: &corev1.Secret{
				Type: corev1.SecretTypeDockerConfigJson,
				Data: map[string][]byte{
					corev1.DockerConfigJsonKey: []byte(`{invalid`),
				},
			},
			registryHost: "registry.example.com",
			wantErr:      true,
			errContains:  "failed to parse",
		},
		{
			name: "dockerconfigjson registry host not found",
			secret: &corev1.Secret{
				Type: corev1.SecretTypeDockerConfigJson,
				Data: map[string][]byte{
					corev1.DockerConfigJsonKey: []byte(
						`{"auths":{"other-registry.io":{"username":"user","password":"pass"}}}`,
					),
				},
			},
			registryHost: "registry.example.com",
			wantErr:      true,
			errContains:  "not found",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			creds, err := k8s.ExtractCredentials(tt.secret, tt.registryHost)

			if tt.wantErr {
				assert.Error(t, err)

				if tt.errContains != "" {
					assert.Contains(t, err.Error(), tt.errContains)
				}

				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantUser, creds.Username)
			assert.Equal(t, tt.wantPass, creds.Password)
		})
	}
}

// TestDefaultSecretName tests that the default secret name constant is correct
func TestDefaultSecretName(t *testing.T) {
	assert.Equal(t, "devbox-registry", k8s.DefaultSecretName)
}

// TestGetNamespaceCredentials_DockerConfigJSON tests using dockerconfigjson secrets
func TestGetNamespaceCredentials_DockerConfigJSON(t *testing.T) {
	secret := createDockerConfigJSONSecret(
		"test-ns",
		k8s.DefaultSecretName,
		"registry.io",
		"docker-user",
		"docker-pass",
	)
	fakeClientset := fake.NewSimpleClientset(secret)
	client := k8s.NewClientWithInterface(fakeClientset, "", "registry.io")

	ctx := context.Background()
	creds, err := client.GetNamespaceCredentials(ctx, "test-ns")

	require.NoError(t, err)
	assert.Equal(t, "docker-user", creds.Username)
	assert.Equal(t, "docker-pass", creds.Password)
}

// TestGetNamespaceCredentials_DockerConfigJSON_AuthOnly tests dockerconfigjson with auth field only
func TestGetNamespaceCredentials_DockerConfigJSON_AuthOnly(t *testing.T) {
	secret := createDockerConfigJSONSecretAuthOnly(
		"test-ns",
		k8s.DefaultSecretName,
		"registry.io",
		"auth-user",
		"auth-pass",
	)
	fakeClientset := fake.NewSimpleClientset(secret)
	client := k8s.NewClientWithInterface(fakeClientset, "", "registry.io")

	ctx := context.Background()
	creds, err := client.GetNamespaceCredentials(ctx, "test-ns")

	require.NoError(t, err)
	assert.Equal(t, "auth-user", creds.Username)
	assert.Equal(t, "auth-pass", creds.Password)
}

// TestClientInterface_Compliance tests that Client implements ClientInterface
func TestClientInterface_Compliance(t *testing.T) {
	fakeClientset := fake.NewSimpleClientset()
	client := k8s.NewClientWithInterface(fakeClientset, "", "registry.io")

	// This will fail at compile time if Client doesn't implement ClientInterface
	var _ k8s.ClientInterface = client
}
