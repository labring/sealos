package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

func NewLog(l *logrus.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set("log", &logrus.Entry{
			Logger: l,
			Data:   make(logrus.Fields),
		})

		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		c.Next()

		param := gin.LogFormatterParams{
			Request: c.Request,
			Keys:    c.Keys,
		}

		// Stop timer
		param.Latency = time.Since(start)

		param.ClientIP = c.ClientIP()
		param.Method = c.Request.Method
		param.StatusCode = c.Writer.Status()
		param.ErrorMessage = c.Errors.ByType(gin.ErrorTypePrivate).String()

		param.BodySize = c.Writer.Size()

		if raw != "" {
			path = path + "?" + raw
		}

		param.Path = path

		logColor(c.MustGet("log").(*logrus.Entry), param)
	}
}

func logColor(log *logrus.Entry, p gin.LogFormatterParams) {
	str := formatter(p)
	code := p.StatusCode
	switch {
	case code >= http.StatusBadRequest && code < http.StatusInternalServerError:
		log.Error(str)
	default:
		log.Info(str)
	}
}

func formatter(param gin.LogFormatterParams) string {
	var statusColor, methodColor, resetColor string
	if param.IsOutputColor() {
		statusColor = param.StatusCodeColor()
		methodColor = param.MethodColor()
		resetColor = param.ResetColor()
	}

	if param.Latency > time.Minute {
		param.Latency = param.Latency.Truncate(time.Second)
	}
	return fmt.Sprintf("[GIN] |%s %3d %s| %13v | %15s |%s %-7s %s %#v\n%s",
		statusColor, param.StatusCode, resetColor,
		param.Latency,
		param.ClientIP,
		methodColor, param.Method, resetColor,
		param.Path,
		param.ErrorMessage,
	)
}

func GetLogger(c *gin.Context) *logrus.Entry {
	// return c.MustGet("log").(*logrus.Entry)
	if log, ok := c.Get("log"); ok {
		return log.(*logrus.Entry)
	}
	return &logrus.Entry{
		Logger: logrus.StandardLogger(),
	}
}
