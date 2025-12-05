package logger

import (
	stdlog "log"
	"os"
	"strings"
	"time"

	log "github.com/sirupsen/logrus"
)

// Options holds logger configuration options
type Options struct {
	Debug  bool
	Level  string
	Format string
}

// Option is a function that configures Options
type Option func(*Options)

// WithDebug enables or disables debug mode
func WithDebug(debug bool) Option {
	return func(o *Options) {
		o.Debug = debug
	}
}

// WithLevel sets the log level (debug, info, warn, error)
func WithLevel(level string) Option {
	return func(o *Options) {
		o.Level = level
	}
}

// WithFormat sets the log format (text or json)
func WithFormat(format string) Option {
	return func(o *Options) {
		o.Format = format
	}
}

// InitLog initializes the logger with the given options
func InitLog(opts ...Option) {
	// Default options
	options := &Options{
		Debug:  false,
		Level:  "info",
		Format: "text",
	}

	// Apply provided options
	for _, opt := range opts {
		opt(options)
	}

	l := log.StandardLogger()

	// Set log level based on configuration
	level := strings.ToLower(options.Level)
	switch level {
	case "debug":
		l.SetLevel(log.DebugLevel)
	case "info":
		l.SetLevel(log.InfoLevel)
	case "warn":
		l.SetLevel(log.WarnLevel)
	case "error":
		l.SetLevel(log.ErrorLevel)
	default:
		l.SetLevel(log.InfoLevel)
	}

	// Enable caller reporting in debug mode
	if options.Debug || level == "debug" {
		l.SetReportCaller(true)
	} else {
		l.SetReportCaller(false)
	}

	l.SetOutput(os.Stdout)
	stdlog.SetOutput(l.Writer())

	// Set formatter based on configuration
	if options.Format == "json" {
		l.SetFormatter(&log.JSONFormatter{
			TimestampFormat: time.DateTime,
		})
	} else {
		l.SetFormatter(&log.TextFormatter{
			ForceColors:      true,
			DisableColors:    false,
			ForceQuote:       options.Debug,
			DisableQuote:     !options.Debug,
			DisableSorting:   false,
			FullTimestamp:    true,
			TimestampFormat:  time.DateTime,
			QuoteEmptyFields: true,
		})
	}
}
