package auth

import (
	"context"
	"crypto/subtle"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/distribution/distribution/v3/registry/auth/token"
	"github.com/labring/sealos/service/rauth/pkg/k8s"
	log "github.com/sirupsen/logrus"
)

// AdminCredentials holds the global admin username and password
type AdminCredentials struct {
	Username string
	Password string
}

// Authenticator handles authentication and authorization for registry requests
type Authenticator struct {
	k8sClient k8s.ClientInterface
	generator *TokenGenerator
	admin     *AdminCredentials // optional global admin account
}

// NewAuthenticator creates a new authenticator
func NewAuthenticator(
	k8sClient k8s.ClientInterface,
	generator *TokenGenerator,
) *Authenticator {
	return &Authenticator{
		k8sClient: k8sClient,
		generator: generator,
	}
}

// SetAdminCredentials sets the global admin credentials
func (a *Authenticator) SetAdminCredentials(username, password string) {
	if username != "" && password != "" {
		a.admin = &AdminCredentials{
			Username: username,
			Password: password,
		}
	}
}

// AuthRequest represents an authentication request
type AuthRequest struct {
	Username string
	Password string
	Service  string
	Scope    string
	ClientID string
}

// AuthResult represents the result of authentication
type AuthResult struct {
	Authenticated bool                     // true if credentials are valid
	Subject       string                   // username/namespace
	Access        []*token.ResourceActions // granted access (empty if no scope or unauthorized)
	Error         error                    // error if authentication or authorization failed
}

// Authenticate authenticates and authorizes a registry request
// Flow: 1. Authenticate (verify credentials) → 2. Authorize (check scope access)
func (a *Authenticator) Authenticate(ctx context.Context, req *AuthRequest) *AuthResult {
	result := &AuthResult{}

	// ===========================================
	// Step 1: Authentication (verify credentials)
	// ===========================================

	// Check if this is the global admin account first
	isAdmin := a.isAdminUser(req.Username, req.Password)

	if isAdmin {
		result.Authenticated = true
		result.Subject = req.Username
		log.WithField("username", req.Username).Info("admin authentication successful")
	} else {
		// Username equals namespace, so we use username to get credentials
		creds, err := a.k8sClient.GetNamespaceCredentials(ctx, req.Username)
		if err != nil {
			log.WithFields(log.Fields{
				"username": req.Username,
				"error":    err,
			}).Warn("authentication failed: namespace not found")

			result.Error = errors.New("authentication failed: invalid credentials")

			return result
		}

		if !a.verifyCredentials(req.Username, req.Password, creds) {
			log.WithField("username", req.Username).Warn("authentication failed: invalid password")

			result.Error = errors.New("authentication failed: invalid credentials")

			return result
		}

		result.Authenticated = true
		result.Subject = req.Username

		log.WithField("username", req.Username).Info("authentication successful")
	}

	// ===========================================
	// Step 2: Authorization (check scope access)
	// ===========================================
	// If no scope, return empty access (e.g., docker login)
	if req.Scope == "" {
		log.Info("no scope requested, returning empty access")

		result.Access = []*token.ResourceActions{}
		return result
	}

	// Parse scope
	access, err := ParseScope(req.Scope)
	if err != nil {
		log.WithFields(log.Fields{
			"scope": req.Scope,
			"error": err,
		}).Warn("failed to parse scope")
		result.Error = fmt.Errorf("invalid scope: %w", err)

		return result
	}

	// Admin has access to all repositories, skip namespace check
	if isAdmin {
		result.Access = []*token.ResourceActions{access}
		log.WithFields(log.Fields{
			"username":   req.Username,
			"repository": access.Name,
			"actions":    access.Actions,
		}).Info("admin authorization granted")

		return result
	}

	// Validate scope type is repository
	if access.Type != "repository" {
		log.WithField("type", access.Type).Warn("unsupported scope type")
		result.Error = fmt.Errorf("unsupported scope type: %s", access.Type)
		return result
	}

	// Authorize: check if user can access the requested repository
	if !a.authorizeAccess(req.Username, access) {
		log.WithFields(log.Fields{
			"username":   req.Username,
			"repository": access.Name,
		}).Warn("authorization denied")
		result.Error = fmt.Errorf("access denied: unauthorized for repository %s", access.Name)

		return result
	}

	result.Access = []*token.ResourceActions{access}
	log.WithFields(log.Fields{
		"username":   req.Username,
		"repository": access.Name,
		"actions":    access.Actions,
	}).Info("authorization successful")

	return result
}

// isAdminUser checks if the provided credentials match the global admin account
func (a *Authenticator) isAdminUser(username, password string) bool {
	if a.admin == nil {
		return false
	}

	usernameMatch := subtle.ConstantTimeCompare([]byte(username), []byte(a.admin.Username)) == 1
	passwordMatch := subtle.ConstantTimeCompare([]byte(password), []byte(a.admin.Password)) == 1

	return usernameMatch && passwordMatch
}

// verifyCredentials verifies username and password against stored credentials
func (a *Authenticator) verifyCredentials(
	username, password string,
	creds *k8s.RegistryCredentials,
) bool {
	// Use constant-time comparison to prevent timing attacks
	usernameMatch := subtle.ConstantTimeCompare([]byte(username), []byte(creds.Username)) == 1
	passwordMatch := subtle.ConstantTimeCompare([]byte(password), []byte(creds.Password)) == 1
	return usernameMatch && passwordMatch
}

// authorizeAccess checks if user can access the requested repository
// username == namespace, so user can only access repos in their own namespace
func (a *Authenticator) authorizeAccess(username string, requested *token.ResourceActions) bool {
	// Extract namespace from repository name (format: namespace/image)
	repoParts := strings.SplitN(requested.Name, "/", 2)
	if len(repoParts) < 2 {
		log.WithField("name", requested.Name).Warn("invalid repository name format")
		return false
	}

	// User can only access repositories in their own namespace
	return repoParts[0] == username
}

// GenerateToken generates a token for the authenticated user
func (a *Authenticator) GenerateToken(result *AuthResult) (*TokenResponse, error) {
	if !result.Authenticated {
		return nil, errors.New("user not authenticated")
	}

	token, err := a.generator.GenerateToken(result.Subject, result.Access)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return &TokenResponse{
		Token:       token,
		AccessToken: token,
		ExpiresIn:   300, // 5 minutes
		IssuedAt:    time.Now().UTC().Format(time.RFC3339),
	}, nil
}
