package middleware

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
)

// GinLogger returns a gin middleware for logging requests
func GinLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		c.Next()

		latency := time.Since(start)

		if raw != "" {
			path = path + "?" + raw
		}

		entry := log.WithFields(log.Fields{
			"status":   c.Writer.Status(),
			"method":   c.Request.Method,
			"path":     path,
			"ip":       c.ClientIP(),
			"latency":  latency,
			"bodySize": c.Writer.Size(),
		})

		switch {
		case len(c.Errors) > 0:
			entry.Error(c.Errors.String())
		case c.Writer.Status() >= http.StatusBadRequest:
			entry.Warn("request completed with error status")
		default:
			entry.Info("request completed")
		}
	}
}
