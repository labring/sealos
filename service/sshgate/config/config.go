// Package config provides configuration management for the SSH gateway
package config

import (
	"errors"
	"fmt"
	"time"

	"github.com/caarlos0/env/v9"
	"github.com/joho/godotenv"
	"github.com/labring/sealos/service/sshgate/gateway"
)

// Config holds all configuration for the SSH gateway
type Config struct {
	// Server configuration
	SSHListenAddr string `env:"SSH_LISTEN_ADDR" envDefault:":2222"`

	// Logging configuration
	Debug     bool   `env:"DEBUG"      envDefault:"false"`
	LogLevel  string `env:"LOG_LEVEL"  envDefault:"info"`
	LogFormat string `env:"LOG_FORMAT" envDefault:"text"`

	// Informer configuration
	InformerResyncPeriod time.Duration `env:"INFORMER_RESYNC_PERIOD" envDefault:"30s"`

	// Security configuration
	SSHHostKeySeed string `env:"SSH_HOST_KEY_SEED" envDefault:"sealos-devbox"`

	// Pprof configuration
	PprofEnabled bool `env:"PPROF_ENABLED" envDefault:"true"`
	PprofPort    int  `env:"PPROF_PORT"    envDefault:"0"`

	// Gateway configuration
	Gateway gateway.Options `envPrefix:""`
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

	// Validate port numbers
	if c.Gateway.SSHBackendPort < 1 || c.Gateway.SSHBackendPort > 65535 {
		return fmt.Errorf("invalid SSH backend port: %d", c.Gateway.SSHBackendPort)
	}

	if c.PprofPort < 0 || c.PprofPort > 65535 {
		return fmt.Errorf("invalid pprof port: %d", c.PprofPort)
	}

	// Validate that at least one proxy mode is enabled
	if !c.Gateway.EnableAgentForward && !c.Gateway.EnableProxyJump {
		return errors.New(
			"at least one proxy mode must be enabled (ENABLE_AGENT_FORWARD or ENABLE_PROXY_JUMP)",
		)
	}

	return nil
}

// NewDefaultConfig creates a config for testing with sensible defaults
func NewDefaultConfig() *Config {
	return &Config{
		SSHListenAddr:        ":2222",
		Debug:                false,
		LogLevel:             "info",
		LogFormat:            "text",
		InformerResyncPeriod: 30 * time.Second,
		SSHHostKeySeed:       "sealos-devbox",
		PprofEnabled:         true,
		PprofPort:            0,
		Gateway:              gateway.DefaultOptions(),
	}
}
