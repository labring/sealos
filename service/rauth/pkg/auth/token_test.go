package auth_test

import (
	"crypto/rand"
	"crypto/rsa"
	"encoding/json"
	"testing"
	"time"

	"github.com/distribution/distribution/v3/registry/auth/token"
	"github.com/golang-jwt/jwt/v5"
	"github.com/labring/sealos/service/rauth/pkg/auth"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestNewTokenGenerator tests creating a new token generator
func TestNewTokenGenerator(t *testing.T) {
	tests := []struct {
		name    string
		option  *auth.TokenOption
		wantErr bool
	}{
		{
			name: "with provided private key",
			option: func() *auth.TokenOption {
				key, _ := rsa.GenerateKey(rand.Reader, 2048)

				return &auth.TokenOption{
					Issuer:     "test-issuer",
					Service:    "test-service",
					Expiration: 5 * time.Minute,
					PrivateKey: key,
				}
			}(),
			wantErr: false,
		},
		{
			name: "without private key (auto-generate)",
			option: &auth.TokenOption{
				Issuer:     "test-issuer",
				Service:    "test-service",
				Expiration: 5 * time.Minute,
			},
			wantErr: false,
		},
		{
			name: "with zero expiration (default)",
			option: &auth.TokenOption{
				Issuer:  "test-issuer",
				Service: "test-service",
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			generator, err := auth.NewTokenGenerator(tt.option)

			if tt.wantErr {
				assert.Error(t, err)
				return
			}

			require.NoError(t, err)
			assert.NotNil(t, generator)
			assert.NotEmpty(t, generator.GetKeyID())
			assert.NotNil(t, generator.GetPublicKey())
		})
	}
}

// TestGenerateToken tests token generation
func TestGenerateToken(t *testing.T) {
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)

	generator, err := auth.NewTokenGenerator(&auth.TokenOption{
		Issuer:     "test-issuer",
		Service:    "test-service",
		Expiration: 5 * time.Minute,
		PrivateKey: privateKey,
	})
	require.NoError(t, err)

	tests := []struct {
		name    string
		subject string
		access  []*token.ResourceActions
	}{
		{
			name:    "simple pull access",
			subject: "test-user",
			access: []*token.ResourceActions{
				{Type: "repository", Name: "namespace/image", Actions: []string{"pull"}},
			},
		},
		{
			name:    "pull and push access",
			subject: "test-user",
			access: []*token.ResourceActions{
				{Type: "repository", Name: "namespace/image", Actions: []string{"pull", "push"}},
			},
		},
		{
			name:    "empty access",
			subject: "test-user",
			access:  []*token.ResourceActions{},
		},
		{
			name:    "nil access",
			subject: "test-user",
			access:  nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tokenString, err := generator.GenerateToken(tt.subject, tt.access)
			require.NoError(t, err)
			assert.NotEmpty(t, tokenString)

			// Parse and verify the token
			token, err := jwt.ParseWithClaims(
				tokenString,
				&auth.Claims{},
				func(token *jwt.Token) (any, error) {
					return &privateKey.PublicKey, nil
				},
			)
			require.NoError(t, err)
			assert.True(t, token.Valid)

			claims, ok := token.Claims.(*auth.Claims)
			require.True(t, ok)
			assert.Equal(t, "test-issuer", claims.Issuer)
			assert.Equal(t, tt.subject, claims.Subject)
			assert.Contains(t, claims.Audience, "test-service")
		})
	}
}

// TestGenerateToken_Expiration tests token expiration settings
func TestGenerateToken_Expiration(t *testing.T) {
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)

	expiration := 10 * time.Minute
	generator, err := auth.NewTokenGenerator(&auth.TokenOption{
		Issuer:     "test-issuer",
		Service:    "test-service",
		Expiration: expiration,
		PrivateKey: privateKey,
	})
	require.NoError(t, err)

	beforeGeneration := time.Now()
	tokenString, err := generator.GenerateToken("test-user", nil)
	require.NoError(t, err)

	token, err := jwt.ParseWithClaims(
		tokenString,
		&auth.Claims{},
		func(token *jwt.Token) (any, error) {
			return &privateKey.PublicKey, nil
		},
	)
	require.NoError(t, err)

	claims, ok := token.Claims.(*auth.Claims)
	require.True(t, ok)
	expectedExpiry := beforeGeneration.Add(expiration)
	assert.WithinDuration(t, expectedExpiry, claims.ExpiresAt.Time, 2*time.Second)
}

// TestParseScope tests scope parsing
func TestParseScope(t *testing.T) {
	tests := []struct {
		name        string
		scope       string
		wantType    string
		wantName    string
		wantActions []string
		wantErr     bool
	}{
		{
			name:        "simple pull scope",
			scope:       "repository:namespace/image:pull",
			wantType:    "repository",
			wantName:    "namespace/image",
			wantActions: []string{"pull"},
		},
		{
			name:        "pull and push scope",
			scope:       "repository:namespace/image:pull,push",
			wantType:    "repository",
			wantName:    "namespace/image",
			wantActions: []string{"pull", "push"},
		},
		{
			name:        "nested repository name",
			scope:       "repository:namespace/sub/image:pull",
			wantType:    "repository",
			wantName:    "namespace/sub/image",
			wantActions: []string{"pull"},
		},
		{
			name:  "empty scope",
			scope: "",
		},
		{
			name:    "invalid scope - missing parts",
			scope:   "repository:namespace/image",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			access, err := auth.ParseScope(tt.scope)

			if tt.wantErr {
				assert.Error(t, err)
				return
			}

			require.NoError(t, err)

			if tt.scope == "" {
				assert.Nil(t, access)
				return
			}

			require.NotNil(t, access)
			assert.Equal(t, tt.wantType, access.Type)
			assert.Equal(t, tt.wantName, access.Name)
			assert.Equal(t, tt.wantActions, access.Actions)
		})
	}
}

// TestExtractNamespaceFromScope tests namespace extraction from scope
func TestExtractNamespaceFromScope(t *testing.T) {
	tests := []struct {
		name          string
		scope         string
		wantNamespace string
		wantErr       bool
	}{
		{
			name:          "simple namespace",
			scope:         "repository:my-namespace/image:pull",
			wantNamespace: "my-namespace",
		},
		{
			name:          "nested path",
			scope:         "repository:team-a/sub/image:pull",
			wantNamespace: "team-a",
		},
		{
			name:          "empty scope",
			scope:         "",
			wantNamespace: "",
		},
		{
			name:    "no namespace separator",
			scope:   "repository:image:pull",
			wantErr: true,
		},
		{
			name:    "invalid scope format",
			scope:   "invalid-scope",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			namespace, err := auth.ExtractNamespaceFromScope(tt.scope)

			if tt.wantErr {
				assert.Error(t, err)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.wantNamespace, namespace)
		})
	}
}

// TestTokenResponse_ToJSON tests JSON serialization of TokenResponse
func TestTokenResponse_ToJSON(t *testing.T) {
	response := &auth.TokenResponse{
		Token:       "token-value",
		AccessToken: "access-token-value",
		ExpiresIn:   300,
		IssuedAt:    "2024-01-01T00:00:00Z",
	}

	jsonBytes, err := response.ToJSON()
	require.NoError(t, err)

	var parsed map[string]any

	err = json.Unmarshal(jsonBytes, &parsed)
	require.NoError(t, err)

	assert.Equal(t, "token-value", parsed["token"])
	assert.Equal(t, float64(300), parsed["expires_in"])
}

// TestTokenSignatureVerification tests that tokens can be verified with correct key
func TestTokenSignatureVerification(t *testing.T) {
	privateKey1, _ := rsa.GenerateKey(rand.Reader, 2048)
	privateKey2, _ := rsa.GenerateKey(rand.Reader, 2048)

	generator, _ := auth.NewTokenGenerator(&auth.TokenOption{
		Issuer:     "test-issuer",
		Service:    "test-service",
		Expiration: 5 * time.Minute,
		PrivateKey: privateKey1,
	})

	tokenString, _ := generator.GenerateToken("test-user", nil)

	// Should verify with correct public key
	_, err := jwt.Parse(tokenString, func(token *jwt.Token) (any, error) {
		return &privateKey1.PublicKey, nil
	})
	assert.NoError(t, err)

	// Should fail with wrong public key
	_, err = jwt.Parse(tokenString, func(token *jwt.Token) (any, error) {
		return &privateKey2.PublicKey, nil
	})
	assert.Error(t, err)
}

// TestAccessStructSerialization tests Access struct JSON serialization
func TestAccessStructSerialization(t *testing.T) {
	access := token.ResourceActions{
		Type:    "repository",
		Name:    "namespace/image",
		Actions: []string{"pull", "push"},
	}

	jsonBytes, err := json.Marshal(access)
	require.NoError(t, err)

	var parsed token.ResourceActions

	err = json.Unmarshal(jsonBytes, &parsed)
	require.NoError(t, err)

	assert.Equal(t, access.Type, parsed.Type)
	assert.Equal(t, access.Name, parsed.Name)
	assert.Equal(t, access.Actions, parsed.Actions)
}
