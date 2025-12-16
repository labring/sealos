// Package config provides configuration management for the SSH gateway
package config

import (
	"errors"
	"fmt"
	"net"
	"time"

	"github.com/caarlos0/env/v9"
	"github.com/joho/godotenv"
	"github.com/labring/sealos/service/sshgate/gateway"
	proxyproto "github.com/pires/go-proxyproto"
)

// Config holds all configuration for the SSH gateway
type Config struct {
	// Server configuration
	SSHListenAddr string `env:"SSH_LISTEN_ADDR" envDefault:":2222"`

	// Proxy Protocol configuration
	EnableProxyProtocol       bool     `env:"ENABLE_PROXY_PROTOCOL"        envDefault:"false"`
	ProxyProtocolTrustedCIDRs []string `env:"PROXY_PROTOCOL_TRUSTED_CIDRS"                    envSeparator:","`
	ProxyProtocolSkipCIDRs    []string `env:"PROXY_PROTOCOL_SKIP_CIDRS"                       envSeparator:","`

	// Logging configuration
	Debug     bool   `env:"DEBUG"      envDefault:"false"`
	LogLevel  string `env:"LOG_LEVEL"  envDefault:"info"`
	LogFormat string `env:"LOG_FORMAT" envDefault:"text"`

	// Informer configuration
	InformerResyncPeriod time.Duration `env:"INFORMER_RESYNC_PERIOD" envDefault:"0s"`

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

	// Validate proxy protocol CIDRs
	for _, cidr := range c.ProxyProtocolTrustedCIDRs {
		if _, _, err := net.ParseCIDR(cidr); err != nil {
			return fmt.Errorf("invalid PROXY_PROTOCOL_TRUSTED_CIDRS value %q: %w", cidr, err)
		}
	}
	for _, cidr := range c.ProxyProtocolSkipCIDRs {
		if _, _, err := net.ParseCIDR(cidr); err != nil {
			return fmt.Errorf("invalid PROXY_PROTOCOL_SKIP_CIDRS value %q: %w", cidr, err)
		}
	}

	return nil
}

// NewDefaultConfig creates a config for testing with sensible defaults
func NewDefaultConfig() *Config {
	return &Config{
		SSHListenAddr:        ":2222",
		EnableProxyProtocol:  false,
		Debug:                false,
		LogLevel:             "info",
		LogFormat:            "text",
		InformerResyncPeriod: 0,
		SSHHostKeySeed:       "sealos-devbox",
		PprofEnabled:         true,
		PprofPort:            0,
		Gateway:              gateway.DefaultOptions(),
	}
}

// ProxyProtocolConnPolicy returns a ConnPolicyFunc for proxy protocol handling.
// - If upstream IP is in SkipCIDRs, SKIP proxy protocol parsing
// - If TrustedCIDRs is empty, USE proxy protocol (trust all)
// - If upstream IP is in TrustedCIDRs, USE proxy protocol
// - Otherwise, REJECT the connection
func (c *Config) ProxyProtocolConnPolicy() proxyproto.ConnPolicyFunc {
	skipNets := make([]*net.IPNet, 0, len(c.ProxyProtocolSkipCIDRs))
	for _, cidr := range c.ProxyProtocolSkipCIDRs {
		_, ipNet, _ := net.ParseCIDR(cidr) // already validated
		skipNets = append(skipNets, ipNet)
	}

	trustedNets := make([]*net.IPNet, 0, len(c.ProxyProtocolTrustedCIDRs))
	for _, cidr := range c.ProxyProtocolTrustedCIDRs {
		_, ipNet, _ := net.ParseCIDR(cidr) // already validated
		trustedNets = append(trustedNets, ipNet)
	}

	return func(opts proxyproto.ConnPolicyOptions) (proxyproto.Policy, error) {
		ip := ipFromAddr(opts.Upstream)
		if ip == nil {
			return proxyproto.REJECT, nil
		}

		// Check if should skip proxy protocol
		for _, ipNet := range skipNets {
			if ipNet.Contains(ip) {
				return proxyproto.SKIP, nil
			}
		}

		// If no trusted CIDRs configured, trust all
		if len(trustedNets) == 0 {
			return proxyproto.USE, nil
		}

		// Check if IP is in trusted CIDRs
		for _, ipNet := range trustedNets {
			if ipNet.Contains(ip) {
				return proxyproto.USE, nil
			}
		}

		// Not trusted, reject
		return proxyproto.REJECT, nil
	}
}

// ipFromAddr extracts IP from net.Addr
func ipFromAddr(addr net.Addr) net.IP {
	if addr == nil {
		return nil
	}
	host, _, err := net.SplitHostPort(addr.String())
	if err != nil {
		return nil
	}
	return net.ParseIP(host)
}
