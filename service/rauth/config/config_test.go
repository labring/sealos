package config

import (
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoad_Defaults(t *testing.T) {
	// Clear environment variables
	clearEnv(t)

	cfg, err := Load()
	require.NoError(t, err)

	assert.Equal(t, 8080, cfg.Port)
	assert.Equal(t, "rauth", cfg.Issuer)
	assert.Equal(t, "registry", cfg.Service)
	assert.Equal(t, "devbox-registry", cfg.SecretName)
	assert.Equal(t, 5*time.Minute, cfg.TokenExpiry)
	assert.Equal(t, "", cfg.PrivateKeyPath)
	assert.False(t, cfg.Debug)
	assert.Equal(t, "info", cfg.LogLevel)
	assert.Equal(t, "text", cfg.LogFormat)
	assert.False(t, cfg.MockMode)
	assert.Equal(t, "", cfg.MockConfigPath)
	assert.Equal(t, "", cfg.AdminUsername)
	assert.Equal(t, "", cfg.AdminPassword)
}

func TestLoad_CustomValues(t *testing.T) {
	clearEnv(t)

	t.Setenv("RAUTH_PORT", "9090")
	t.Setenv("RAUTH_ISSUER", "custom-issuer")
	t.Setenv("RAUTH_SERVICE", "custom-registry")
	t.Setenv("RAUTH_SECRET_NAME", "custom-secret")
	t.Setenv("RAUTH_TOKEN_EXPIRY", "10m")
	t.Setenv("RAUTH_PRIVATE_KEY", "/path/to/key")
	t.Setenv("DEBUG", "true")
	t.Setenv("LOG_LEVEL", "debug")
	t.Setenv("LOG_FORMAT", "json")
	t.Setenv("RAUTH_MOCK_MODE", "true")
	t.Setenv("RAUTH_MOCK_CONFIG", "/path/to/config.json")
	t.Setenv("RAUTH_ADMIN_USERNAME", "admin")
	t.Setenv("RAUTH_ADMIN_PASSWORD", "secret")

	cfg, err := Load()
	require.NoError(t, err)

	assert.Equal(t, 9090, cfg.Port)
	assert.Equal(t, "custom-issuer", cfg.Issuer)
	assert.Equal(t, "custom-registry", cfg.Service)
	assert.Equal(t, "custom-secret", cfg.SecretName)
	assert.Equal(t, 10*time.Minute, cfg.TokenExpiry)
	assert.Equal(t, "/path/to/key", cfg.PrivateKeyPath)
	assert.True(t, cfg.Debug)
	assert.Equal(t, "debug", cfg.LogLevel)
	assert.Equal(t, "json", cfg.LogFormat)
	assert.True(t, cfg.MockMode)
	assert.Equal(t, "/path/to/config.json", cfg.MockConfigPath)
	assert.Equal(t, "admin", cfg.AdminUsername)
	assert.Equal(t, "secret", cfg.AdminPassword)
}

func TestLoad_InvalidLogLevel(t *testing.T) {
	clearEnv(t)

	t.Setenv("LOG_LEVEL", "invalid")

	_, err := Load()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid log level")
}

func TestLoad_InvalidLogFormat(t *testing.T) {
	clearEnv(t)

	t.Setenv("LOG_FORMAT", "yaml")

	_, err := Load()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "invalid log format")
}

func TestLoad_InvalidPort(t *testing.T) {
	tests := []struct {
		name string
		port string
	}{
		{"port zero", "0"},
		{"port negative", "-1"},
		{"port too high", "65536"},
		{"port way too high", "100000"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			clearEnv(t)
			t.Setenv("RAUTH_PORT", tt.port)

			_, err := Load()
			require.Error(t, err)
			assert.Contains(t, err.Error(), "invalid port")
		})
	}
}

func TestLoad_ValidLogLevels(t *testing.T) {
	levels := []string{"debug", "info", "warn", "error"}

	for _, level := range levels {
		t.Run(level, func(t *testing.T) {
			clearEnv(t)
			t.Setenv("LOG_LEVEL", level)

			cfg, err := Load()
			require.NoError(t, err)
			assert.Equal(t, level, cfg.LogLevel)
		})
	}
}

func TestLoad_ValidLogFormats(t *testing.T) {
	formats := []string{"text", "json"}

	for _, format := range formats {
		t.Run(format, func(t *testing.T) {
			clearEnv(t)
			t.Setenv("LOG_FORMAT", format)

			cfg, err := Load()
			require.NoError(t, err)
			assert.Equal(t, format, cfg.LogFormat)
		})
	}
}

func TestLoad_ValidPorts(t *testing.T) {
	tests := []struct {
		name string
		port string
		want int
	}{
		{"min port", "1", 1},
		{"common port", "8080", 8080},
		{"https port", "443", 443},
		{"max port", "65535", 65535},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			clearEnv(t)
			t.Setenv("RAUTH_PORT", tt.port)

			cfg, err := Load()
			require.NoError(t, err)
			assert.Equal(t, tt.want, cfg.Port)
		})
	}
}

func TestNewDefaultConfig(t *testing.T) {
	cfg := NewDefaultConfig()

	assert.Equal(t, 8080, cfg.Port)
	assert.Equal(t, "rauth", cfg.Issuer)
	assert.Equal(t, "registry", cfg.Service)
	assert.Equal(t, "devbox-registry", cfg.SecretName)
	assert.Equal(t, 5*time.Minute, cfg.TokenExpiry)
	assert.False(t, cfg.Debug)
	assert.Equal(t, "info", cfg.LogLevel)
	assert.Equal(t, "text", cfg.LogFormat)
	assert.False(t, cfg.MockMode)
}

func TestLoad_TokenExpiryParsing(t *testing.T) {
	tests := []struct {
		name   string
		expiry string
		want   time.Duration
	}{
		{"minutes", "10m", 10 * time.Minute},
		{"hours", "1h", time.Hour},
		{"seconds", "30s", 30 * time.Second},
		{"combined", "1h30m", 90 * time.Minute},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			clearEnv(t)
			t.Setenv("RAUTH_TOKEN_EXPIRY", tt.expiry)

			cfg, err := Load()
			require.NoError(t, err)
			assert.Equal(t, tt.want, cfg.TokenExpiry)
		})
	}
}

// clearEnv clears all rauth-related environment variables
func clearEnv(t *testing.T) {
	t.Helper()

	envVars := []string{
		"RAUTH_PORT",
		"RAUTH_ISSUER",
		"RAUTH_SERVICE",
		"RAUTH_SECRET_NAME",
		"RAUTH_TOKEN_EXPIRY",
		"RAUTH_PRIVATE_KEY",
		"DEBUG",
		"LOG_LEVEL",
		"LOG_FORMAT",
		"RAUTH_MOCK_MODE",
		"RAUTH_MOCK_CONFIG",
		"RAUTH_ADMIN_USERNAME",
		"RAUTH_ADMIN_PASSWORD",
	}

	for _, env := range envVars {
		os.Unsetenv(env)
	}
}
