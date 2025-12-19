package auth

import (
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/distribution/distribution/v3/registry/auth/token"
	"github.com/golang-jwt/jwt/v5"
)

// TokenOption contains options for token generation
type TokenOption struct {
	Issuer     string
	Service    string
	Expiration time.Duration
	PrivateKey *rsa.PrivateKey
}

// Claims represents the JWT claims for Docker Registry token
// Note: Docker Registry expects 'aud' to be a string, not an array
type Claims struct {
	Issuer    string                   `json:"iss,omitempty"`
	Subject   string                   `json:"sub,omitempty"`
	Audience  string                   `json:"aud,omitempty"`
	ExpiresAt *jwt.NumericDate         `json:"exp,omitempty"`
	NotBefore *jwt.NumericDate         `json:"nbf,omitempty"`
	IssuedAt  *jwt.NumericDate         `json:"iat,omitempty"`
	JWTID     string                   `json:"jti,omitempty"`
	Access    []*token.ResourceActions `json:"access,omitempty"`
}

// GetExpirationTime implements jwt.Claims interface
func (c Claims) GetExpirationTime() (*jwt.NumericDate, error) {
	return c.ExpiresAt, nil
}

// GetIssuedAt implements jwt.Claims interface
func (c Claims) GetIssuedAt() (*jwt.NumericDate, error) {
	return c.IssuedAt, nil
}

// GetNotBefore implements jwt.Claims interface
func (c Claims) GetNotBefore() (*jwt.NumericDate, error) {
	return c.NotBefore, nil
}

// GetIssuer implements jwt.Claims interface
func (c Claims) GetIssuer() (string, error) {
	return c.Issuer, nil
}

// GetSubject implements jwt.Claims interface
func (c Claims) GetSubject() (string, error) {
	return c.Subject, nil
}

// GetAudience implements jwt.Claims interface
func (c Claims) GetAudience() (jwt.ClaimStrings, error) {
	if c.Audience == "" {
		return nil, nil
	}
	return jwt.ClaimStrings{c.Audience}, nil
}

// TokenGenerator generates Docker Registry authentication tokens
type TokenGenerator struct {
	option *TokenOption
	keyID  string
}

// NewTokenGenerator creates a new token generator
func NewTokenGenerator(option *TokenOption) (*TokenGenerator, error) {
	if option.PrivateKey == nil {
		// Generate a new RSA key if not provided
		privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
		if err != nil {
			return nil, fmt.Errorf("failed to generate RSA key: %w", err)
		}

		option.PrivateKey = privateKey
	}

	if option.Expiration == 0 {
		option.Expiration = 5 * time.Minute
	}

	// Generate key ID from public key
	keyID := generateKeyID(&option.PrivateKey.PublicKey)

	return &TokenGenerator{
		option: option,
		keyID:  keyID,
	}, nil
}

// GenerateToken generates a JWT token for the given access
func (g *TokenGenerator) GenerateToken(
	subject string,
	access []*token.ResourceActions,
) (string, error) {
	now := time.Now()

	claims := Claims{
		Issuer:    g.option.Issuer,
		Subject:   subject,
		Audience:  g.option.Service,
		ExpiresAt: jwt.NewNumericDate(now.Add(g.option.Expiration)),
		NotBefore: jwt.NewNumericDate(now),
		IssuedAt:  jwt.NewNumericDate(now),
		JWTID:     generateJTI(),
		Access:    access,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	token.Header["kid"] = g.keyID

	tokenString, err := token.SignedString(g.option.PrivateKey)
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, nil
}

// GetPublicKey returns the public key in JWK format
func (g *TokenGenerator) GetPublicKey() *rsa.PublicKey {
	return &g.option.PrivateKey.PublicKey
}

// GetKeyID returns the key ID
func (g *TokenGenerator) GetKeyID() string {
	return g.keyID
}

// generateKeyID generates a key ID from the public key using JWK Thumbprint (RFC 7638)
// Uses the upstream distribution library to ensure compatibility with Docker Registry v3
func generateKeyID(publicKey *rsa.PublicKey) string {
	return token.GetRFC7638Thumbprint(publicKey)
}

// generateJTI generates a unique token ID
func generateJTI() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}

// ParseScope parses the scope string from registry request
// Format: repository:namespace/image:action1,action2
func ParseScope(scope string) (*token.ResourceActions, error) {
	if scope == "" {
		return nil, nil
	}

	parts := strings.SplitN(scope, ":", 3)
	if len(parts) != 3 {
		return nil, fmt.Errorf("invalid scope format: %s", scope)
	}

	resourceType := parts[0]
	resourceName := parts[1]
	actions := strings.Split(parts[2], ",")

	return &token.ResourceActions{
		Type:    resourceType,
		Name:    resourceName,
		Actions: actions,
	}, nil
}

// ExtractNamespaceFromScope extracts namespace from scope
// Scope format: repository:namespace/image:actions
func ExtractNamespaceFromScope(scope string) (string, error) {
	access, err := ParseScope(scope)
	if err != nil {
		return "", err
	}

	if access == nil {
		return "", nil
	}

	// Only handle repository type scopes
	// Other types like "registry:catalog:*" are not supported
	if access.Type != "repository" {
		return "", fmt.Errorf(
			"unsupported scope type: %s (only 'repository' is supported)",
			access.Type,
		)
	}

	// Extract namespace from resource name (format: namespace/image)
	parts := strings.SplitN(access.Name, "/", 2)
	if len(parts) < 2 {
		return "", fmt.Errorf(
			"invalid repository name format, expected namespace/image: %s",
			access.Name,
		)
	}

	return parts[0], nil
}

// TokenResponse represents the response for token request
type TokenResponse struct {
	Token       string `json:"token"`
	AccessToken string `json:"access_token,omitempty"`
	ExpiresIn   int    `json:"expires_in"`
	IssuedAt    string `json:"issued_at"`
}

// ToJSON converts TokenResponse to JSON bytes
func (r *TokenResponse) ToJSON() ([]byte, error) {
	return json.Marshal(r)
}
