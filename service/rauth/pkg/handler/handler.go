package handler

import (
	"encoding/base64"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/rauth/pkg/auth"
	log "github.com/sirupsen/logrus"
)

// Handler handles HTTP requests for registry authentication
type Handler struct {
	authenticator *auth.Authenticator
}

// NewHandler creates a new HTTP handler
func NewHandler(authenticator *auth.Authenticator) *Handler {
	return &Handler{
		authenticator: authenticator,
	}
}

// TokenHandler handles token requests from Docker Registry
// GET /token?service=xxx&scope=repository:namespace/image:pull
func (h *Handler) TokenHandler(c *gin.Context) {
	// Extract Basic Auth credentials
	username, password, ok := h.extractBasicAuth(c)
	if !ok {
		log.Warn("missing or invalid authorization header")
		h.unauthorizedResponse(c, "missing credentials")
		return
	}

	// Parse query parameters
	service := c.Query("service")
	scope := c.Query("scope")
	clientID := c.Query("client_id")

	log.WithFields(log.Fields{
		"service":  service,
		"scope":    scope,
		"username": username,
	}).Info("token request received")

	// Create auth request
	authReq := &auth.AuthRequest{
		Username: username,
		Password: password,
		Service:  service,
		Scope:    scope,
		ClientID: clientID,
	}

	// Authenticate
	result := h.authenticator.Authenticate(c.Request.Context(), authReq)
	if result.Error != nil || !result.Authenticated {
		log.WithFields(log.Fields{
			"username": username,
			"error":    result.Error,
		}).Warn("authentication failed")
		h.unauthorizedResponse(c, "authentication failed")
		return
	}

	// Generate token
	tokenResp, err := h.authenticator.GenerateToken(result)
	if err != nil {
		log.WithError(err).Error("failed to generate token")
		h.internalErrorResponse(c, "failed to generate token")
		return
	}

	c.JSON(http.StatusOK, tokenResp)
}

// HealthHandler handles health check requests
func (h *Handler) HealthHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "healthy"})
}

// extractBasicAuth extracts username and password from Basic Auth header
func (h *Handler) extractBasicAuth(c *gin.Context) (username, password string, ok bool) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return "", "", false
	}

	// Handle Basic Auth
	if !strings.HasPrefix(authHeader, "Basic ") {
		return "", "", false
	}

	encoded := strings.TrimPrefix(authHeader, "Basic ")

	decoded, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", "", false
	}

	parts := strings.SplitN(string(decoded), ":", 2)
	if len(parts) != 2 {
		return "", "", false
	}

	return parts[0], parts[1], true
}

// unauthorizedResponse sends a 401 Unauthorized response
func (h *Handler) unauthorizedResponse(c *gin.Context, message string) {
	c.Header("WWW-Authenticate", `Basic realm="Registry Authentication"`)
	c.JSON(http.StatusUnauthorized, gin.H{
		"error":             "unauthorized",
		"error_description": message,
	})
}

// internalErrorResponse sends a 500 Internal Server Error response
func (h *Handler) internalErrorResponse(c *gin.Context, message string) {
	c.JSON(http.StatusInternalServerError, gin.H{
		"error":             "internal_error",
		"error_description": message,
	})
}
