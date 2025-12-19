// Package config provides configuration management for rauth service
package config

import (
	"fmt"
	"time"

	"github.com/caarlos0/env/v9"
	"github.com/joho/godotenv"
)

// Config holds all configuration for the rauth service
type Config struct {
	// Server configuration
	Port int `env:"RAUTH_PORT" envDefault:"8080"`

	// Auth configuration
	Issuer      string        `env:"RAUTH_ISSUER"       envDefault:"rauth"`
	Service     string        `env:"RAUTH_SERVICE"      envDefault:"registry"`
	SecretName  string        `env:"RAUTH_SECRET_NAME"  envDefault:"devbox-registry"`
	TokenExpiry time.Duration `env:"RAUTH_TOKEN_EXPIRY" envDefault:"5m"`

	// Private key configuration
	PrivateKeyPath string `env:"RAUTH_PRIVATE_KEY"`

	// Logging configuration
	Debug     bool   `env:"DEBUG"      envDefault:"false"`
	LogLevel  string `env:"LOG_LEVEL"  envDefault:"info"`
	LogFormat string `env:"LOG_FORMAT" envDefault:"text"`

	// Mock mode configuration
	MockMode       bool   `env:"RAUTH_MOCK_MODE"   envDefault:"false"`
	MockConfigPath string `env:"RAUTH_MOCK_CONFIG"`

	// Admin credentials
	AdminUsername string `env:"RAUTH_ADMIN_USERNAME"`
	AdminPassword string `env:"RAUTH_ADMIN_PASSWORD"`
}

// Load loads configuration from environment variables
// It will attempt to load .env file if it exists
func Load() (*Config, error) {
	// Try to load .env file, but don't fail if it doesn't exist
	_ = godotenv.Load()

	cfg := &Config{}
	if err := env.Parse(cfg); err != nil {
		return nil, fmt.Errorf("failed to parse environment variables: %w", err)
	}

	// Validate configuration
	if err := cfg.validate(); err != nil {
		return nil, fmt.Errorf("invalid configuration: %w", err)
	}

	return cfg, nil
}

// validate validates the configuration
func (c *Config) validate() error {
	// Validate log level
	validLogLevels := map[string]bool{
		"debug": true,
		"info":  true,
		"warn":  true,
		"error": true,
	}
	if !validLogLevels[c.LogLevel] {
		return fmt.Errorf("invalid log level: %s (must be debug, info, warn, or error)", c.LogLevel)
	}

	// Validate log format
	validLogFormats := map[string]bool{
		"text": true,
		"json": true,
	}
	if !validLogFormats[c.LogFormat] {
		return fmt.Errorf("invalid log format: %s (must be text or json)", c.LogFormat)
	}

	// Validate port
	if c.Port < 1 || c.Port > 65535 {
		return fmt.Errorf("invalid port: %d", c.Port)
	}

	return nil
}

// NewDefaultConfig creates a config for testing with sensible defaults
func NewDefaultConfig() *Config {
	return &Config{
		Port:        8080,
		Issuer:      "rauth",
		Service:     "registry",
		SecretName:  "devbox-registry",
		TokenExpiry: 5 * time.Minute,
		Debug:       false,
		LogLevel:    "info",
		LogFormat:   "text",
		MockMode:    false,
	}
}
