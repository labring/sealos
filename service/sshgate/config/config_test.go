package config_test

import (
	"net"
	"testing"
	"time"

	proxyproto "github.com/pires/go-proxyproto"

	"github.com/labring/sealos/service/sshgate/config"
	"github.com/labring/sealos/service/sshgate/gateway"
)

func TestLoad(t *testing.T) {
	t.Run("LoadWithDefaults", func(t *testing.T) {
		cfg, err := config.Load()
		if err != nil {
			t.Fatalf("Load() failed: %v", err)
		}

		// Verify default values
		if cfg.SSHListenAddr != ":2222" {
			t.Errorf("SSHListenAddr = %s, want :2222", cfg.SSHListenAddr)
		}

		if cfg.Debug != false {
			t.Errorf("Debug = %v, want false", cfg.Debug)
		}

		if cfg.LogLevel != "info" {
			t.Errorf("LogLevel = %s, want info", cfg.LogLevel)
		}

		if cfg.LogFormat != "text" {
			t.Errorf("LogFormat = %s, want text", cfg.LogFormat)
		}

		if cfg.Gateway.SSHBackendPort != 22 {
			t.Errorf("Gateway.SSHBackendPort = %d, want 22", cfg.Gateway.SSHBackendPort)
		}

		if cfg.Gateway.EnableAgentForward != true {
			t.Errorf("Gateway.EnableAgentForward = %v, want true", cfg.Gateway.EnableAgentForward)
		}

		if cfg.Gateway.EnableProxyJump != false {
			t.Errorf("Gateway.EnableProxyJump = %v, want true", cfg.Gateway.EnableProxyJump)
		}
	})

	t.Run("LoadWithCustomValues", func(t *testing.T) {
		// Set custom env vars
		t.Setenv("SSH_LISTEN_ADDR", ":3333")
		t.Setenv("DEBUG", "true")
		t.Setenv("LOG_LEVEL", "debug")
		t.Setenv("LOG_FORMAT", "json")
		t.Setenv("SSH_BACKEND_PORT", "2222")
		t.Setenv("ENABLE_AGENT_FORWARD", "false")
		t.Setenv("ENABLE_PROXY_JUMP", "true")
		t.Setenv("SSH_HOST_KEY_SEED", "custom-seed")
		t.Setenv("PPROF_PORT", "6060")

		cfg, err := config.Load()
		if err != nil {
			t.Fatalf("Load() failed: %v", err)
		}

		if cfg.SSHListenAddr != ":3333" {
			t.Errorf("SSHListenAddr = %s, want :3333", cfg.SSHListenAddr)
		}

		if cfg.Debug != true {
			t.Errorf("Debug = %v, want true", cfg.Debug)
		}

		if cfg.LogLevel != "debug" {
			t.Errorf("LogLevel = %s, want debug", cfg.LogLevel)
		}

		if cfg.LogFormat != "json" {
			t.Errorf("LogFormat = %s, want json", cfg.LogFormat)
		}

		if cfg.Gateway.SSHBackendPort != 2222 {
			t.Errorf("Gateway.SSHBackendPort = %d, want 2222", cfg.Gateway.SSHBackendPort)
		}

		if cfg.Gateway.EnableAgentForward != false {
			t.Errorf("Gateway.EnableAgentForward = %v, want false", cfg.Gateway.EnableAgentForward)
		}

		if cfg.Gateway.EnableProxyJump != true {
			t.Errorf("Gateway.EnableProxyJump = %v, want true", cfg.Gateway.EnableProxyJump)
		}

		if cfg.SSHHostKeySeed != "custom-seed" {
			t.Errorf("SSHHostKeySeed = %s, want custom-seed", cfg.SSHHostKeySeed)
		}

		if cfg.PprofPort != 6060 {
			t.Errorf("PprofPort = %d, want 6060", cfg.PprofPort)
		}
	})

	t.Run("LoadWithInvalidLogLevel", func(t *testing.T) {
		t.Setenv("LOG_LEVEL", "invalid")

		_, err := config.Load()
		if err == nil {
			t.Fatal("Expected error for invalid log level, got nil")
		}
	})

	t.Run("LoadWithInvalidLogFormat", func(t *testing.T) {
		t.Setenv("LOG_FORMAT", "invalid")

		_, err := config.Load()
		if err == nil {
			t.Fatal("Expected error for invalid log format, got nil")
		}
	})

	t.Run("LoadWithInvalidSSHBackendPort", func(t *testing.T) {
		t.Setenv("SSH_BACKEND_PORT", "70000")

		_, err := config.Load()
		if err == nil {
			t.Fatal("Expected error for invalid SSH backend port, got nil")
		}
	})

	t.Run("LoadWithInvalidPprofPort", func(t *testing.T) {
		t.Setenv("PPROF_PORT", "70000")

		_, err := config.Load()
		if err == nil {
			t.Fatal("Expected error for invalid pprof port, got nil")
		}
	})

	t.Run("LoadWithBothProxyModesDisabled", func(t *testing.T) {
		t.Setenv("ENABLE_AGENT_FORWARD", "false")
		t.Setenv("ENABLE_PROXY_JUMP", "false")

		_, err := config.Load()
		if err == nil {
			t.Fatal("Expected error when both proxy modes are disabled, got nil")
		}
	})

	t.Run("LoadWithTimeoutValues", func(t *testing.T) {
		t.Setenv("SSH_HANDSHAKE_TIMEOUT", "30s")
		t.Setenv("BACKEND_CONNECT_TIMEOUT_PUBLICKEY", "20s")
		t.Setenv("BACKEND_CONNECT_TIMEOUT_AGENT", "10s")
		t.Setenv("PROXY_JUMP_TIMEOUT", "8s")
		t.Setenv("SESSION_REQUEST_TIMEOUT", "5s")
		t.Setenv("INFORMER_RESYNC_PERIOD", "60s")

		cfg, err := config.Load()
		if err != nil {
			t.Fatalf("Load() failed: %v", err)
		}

		if cfg.Gateway.SSHHandshakeTimeout != 30*time.Second {
			t.Errorf("SSHHandshakeTimeout = %v, want 30s", cfg.Gateway.SSHHandshakeTimeout)
		}

		if cfg.Gateway.BackendConnectTimeoutPublicKey != 20*time.Second {
			t.Errorf(
				"BackendConnectTimeoutPublicKey = %v, want 20s",
				cfg.Gateway.BackendConnectTimeoutPublicKey,
			)
		}

		if cfg.Gateway.BackendConnectTimeoutAgent != 10*time.Second {
			t.Errorf(
				"BackendConnectTimeoutAgent = %v, want 10s",
				cfg.Gateway.BackendConnectTimeoutAgent,
			)
		}

		if cfg.Gateway.ProxyJumpTimeout != 8*time.Second {
			t.Errorf("ProxyJumpTimeout = %v, want 8s", cfg.Gateway.ProxyJumpTimeout)
		}

		if cfg.Gateway.SessionRequestTimeout != 5*time.Second {
			t.Errorf("SessionRequestTimeout = %v, want 5s", cfg.Gateway.SessionRequestTimeout)
		}

		if cfg.InformerResyncPeriod != 60*time.Second {
			t.Errorf("InformerResyncPeriod = %v, want 60s", cfg.InformerResyncPeriod)
		}
	})

	t.Run("LoadWithSecurityOptions", func(t *testing.T) {
		t.Setenv("MAX_CACHED_REQUESTS", "10")

		cfg, err := config.Load()
		if err != nil {
			t.Fatalf("Load() failed: %v", err)
		}

		if cfg.Gateway.MaxCachedRequests != 10 {
			t.Errorf("MaxCachedRequests = %d, want 10", cfg.Gateway.MaxCachedRequests)
		}
	})
}

func TestNewDefaultConfig(t *testing.T) {
	cfg := config.NewDefaultConfig()

	if cfg == nil {
		t.Fatal("NewDefaultConfig() returned nil")
	}

	// Test basic fields
	if cfg.SSHListenAddr != ":2222" {
		t.Errorf("SSHListenAddr = %s, want :2222", cfg.SSHListenAddr)
	}

	if cfg.Debug != false {
		t.Errorf("Debug = %v, want false", cfg.Debug)
	}

	if cfg.LogLevel != "info" {
		t.Errorf("LogLevel = %s, want info", cfg.LogLevel)
	}

	if cfg.LogFormat != "text" {
		t.Errorf("LogFormat = %s, want text", cfg.LogFormat)
	}

	if cfg.InformerResyncPeriod != 30*time.Second {
		t.Errorf("InformerResyncPeriod = %v, want 30s", cfg.InformerResyncPeriod)
	}

	if cfg.SSHHostKeySeed != "sealos-devbox" {
		t.Errorf("SSHHostKeySeed = %s, want sealos-devbox", cfg.SSHHostKeySeed)
	}

	if cfg.PprofEnabled != true {
		t.Errorf("PprofEnabled = %v, want true", cfg.PprofEnabled)
	}

	if cfg.PprofPort != 0 {
		t.Errorf("PprofPort = %d, want 0", cfg.PprofPort)
	}

	// Test gateway options - should match DefaultOptions()
	defaultGateway := gateway.DefaultOptions()

	if cfg.Gateway.SSHHandshakeTimeout != defaultGateway.SSHHandshakeTimeout {
		t.Errorf(
			"Gateway.SSHHandshakeTimeout = %v, want %v",
			cfg.Gateway.SSHHandshakeTimeout,
			defaultGateway.SSHHandshakeTimeout,
		)
	}

	if cfg.Gateway.SSHBackendPort != defaultGateway.SSHBackendPort {
		t.Errorf(
			"Gateway.SSHBackendPort = %d, want %d",
			cfg.Gateway.SSHBackendPort,
			defaultGateway.SSHBackendPort,
		)
	}

	if cfg.Gateway.EnableAgentForward != defaultGateway.EnableAgentForward {
		t.Errorf(
			"Gateway.EnableAgentForward = %v, want %v",
			cfg.Gateway.EnableAgentForward,
			defaultGateway.EnableAgentForward,
		)
	}

	if cfg.Gateway.EnableProxyJump != defaultGateway.EnableProxyJump {
		t.Errorf(
			"Gateway.EnableProxyJump = %v, want %v",
			cfg.Gateway.EnableProxyJump,
			defaultGateway.EnableProxyJump,
		)
	}
}

func TestValidLogLevels(t *testing.T) {
	validLevels := []string{"debug", "info", "warn", "error"}

	for _, level := range validLevels {
		t.Run(level, func(t *testing.T) {
			t.Setenv("LOG_LEVEL", level)

			cfg, err := config.Load()
			if err != nil {
				t.Fatalf("Load() failed for valid log level %s: %v", level, err)
			}

			if cfg.LogLevel != level {
				t.Errorf("LogLevel = %s, want %s", cfg.LogLevel, level)
			}
		})
	}
}

func TestValidLogFormats(t *testing.T) {
	validFormats := []string{"text", "json"}

	for _, format := range validFormats {
		t.Run(format, func(t *testing.T) {
			t.Setenv("LOG_FORMAT", format)

			cfg, err := config.Load()
			if err != nil {
				t.Fatalf("Load() failed for valid log format %s: %v", format, err)
			}

			if cfg.LogFormat != format {
				t.Errorf("LogFormat = %s, want %s", cfg.LogFormat, format)
			}
		})
	}
}

func TestProxyModeValidation(t *testing.T) {
	tests := []struct {
		name             string
		enableAgentForwd string
		enableProxyJump  string
		shouldFail       bool
		description      string
	}{
		{
			name:             "BothEnabled",
			enableAgentForwd: "true",
			enableProxyJump:  "true",
			shouldFail:       false,
			description:      "Both modes enabled should succeed",
		},
		{
			name:             "OnlyAgentForward",
			enableAgentForwd: "true",
			enableProxyJump:  "false",
			shouldFail:       false,
			description:      "Only agent forward enabled should succeed",
		},
		{
			name:             "OnlyProxyJump",
			enableAgentForwd: "false",
			enableProxyJump:  "true",
			shouldFail:       false,
			description:      "Only proxy jump enabled should succeed",
		},
		{
			name:             "BothDisabled",
			enableAgentForwd: "false",
			enableProxyJump:  "false",
			shouldFail:       true,
			description:      "Both modes disabled should fail",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("ENABLE_AGENT_FORWARD", tt.enableAgentForwd)
			t.Setenv("ENABLE_PROXY_JUMP", tt.enableProxyJump)

			_, err := config.Load()

			if tt.shouldFail && err == nil {
				t.Errorf("%s: expected error but got none", tt.description)
			}

			if !tt.shouldFail && err != nil {
				t.Errorf("%s: unexpected error: %v", tt.description, err)
			}
		})
	}
}

func TestPortValidation(t *testing.T) {
	tests := []struct {
		name       string
		envVar     string
		value      string
		shouldFail bool
	}{
		{"ValidSSHBackendPort", "SSH_BACKEND_PORT", "22", false},
		{"ValidSSHBackendPortHigh", "SSH_BACKEND_PORT", "65535", false},
		{"InvalidSSHBackendPortZero", "SSH_BACKEND_PORT", "0", true},
		{"InvalidSSHBackendPortNegative", "SSH_BACKEND_PORT", "-1", true},
		{"InvalidSSHBackendPortTooHigh", "SSH_BACKEND_PORT", "65536", true},
		{"ValidPprofPortZero", "PPROF_PORT", "0", false},
		{"ValidPprofPort", "PPROF_PORT", "6060", false},
		{"ValidPprofPortHigh", "PPROF_PORT", "65535", false},
		{"InvalidPprofPortNegative", "PPROF_PORT", "-1", true},
		{"InvalidPprofPortTooHigh", "PPROF_PORT", "65536", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv(tt.envVar, tt.value)

			_, err := config.Load()

			if tt.shouldFail && err == nil {
				t.Errorf("Expected error for %s=%s, got none", tt.envVar, tt.value)
			}

			if !tt.shouldFail && err != nil {
				t.Errorf("Unexpected error for %s=%s: %v", tt.envVar, tt.value, err)
			}
		})
	}
}

func TestProxyProtocolCIDRValidation(t *testing.T) {
	tests := []struct {
		name       string
		envVar     string
		value      string
		shouldFail bool
	}{
		{"ValidTrustedCIDR", "PROXY_PROTOCOL_TRUSTED_CIDRS", "10.0.0.0/8", false},
		{"ValidTrustedCIDRMultiple", "PROXY_PROTOCOL_TRUSTED_CIDRS", "10.0.0.0/8,172.16.0.0/12", false},
		{"ValidSkipCIDR", "PROXY_PROTOCOL_SKIP_CIDRS", "10.244.0.0/16", false},
		{"ValidSkipCIDRMultiple", "PROXY_PROTOCOL_SKIP_CIDRS", "10.244.0.0/16,192.168.0.0/16", false},
		{"InvalidTrustedCIDR", "PROXY_PROTOCOL_TRUSTED_CIDRS", "invalid", true},
		{"InvalidTrustedCIDRPartial", "PROXY_PROTOCOL_TRUSTED_CIDRS", "10.0.0.0/8,invalid", true},
		{"InvalidSkipCIDR", "PROXY_PROTOCOL_SKIP_CIDRS", "not-a-cidr", true},
		{"EmptyTrustedCIDR", "PROXY_PROTOCOL_TRUSTED_CIDRS", "", false},
		{"EmptySkipCIDR", "PROXY_PROTOCOL_SKIP_CIDRS", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv(tt.envVar, tt.value)

			_, err := config.Load()

			if tt.shouldFail && err == nil {
				t.Errorf("Expected error for %s=%s, got none", tt.envVar, tt.value)
			}

			if !tt.shouldFail && err != nil {
				t.Errorf("Unexpected error for %s=%s: %v", tt.envVar, tt.value, err)
			}
		})
	}
}

func TestProxyProtocolConnPolicy(t *testing.T) {
	tests := []struct {
		name         string
		trustedCIDRs []string
		skipCIDRs    []string
		upstreamIP   string
		wantPolicy   proxyproto.Policy
	}{
		{
			name:         "NoConfig_TrustAll",
			trustedCIDRs: nil,
			skipCIDRs:    nil,
			upstreamIP:   "1.2.3.4:12345",
			wantPolicy:   proxyproto.USE,
		},
		{
			name:         "EmptyTrusted_TrustAll",
			trustedCIDRs: []string{},
			skipCIDRs:    []string{},
			upstreamIP:   "192.168.1.100:12345",
			wantPolicy:   proxyproto.USE,
		},
		{
			name:         "TrustedCIDR_IPInRange",
			trustedCIDRs: []string{"10.0.0.0/8"},
			skipCIDRs:    nil,
			upstreamIP:   "10.1.2.3:12345",
			wantPolicy:   proxyproto.USE,
		},
		{
			name:         "TrustedCIDR_IPNotInRange",
			trustedCIDRs: []string{"10.0.0.0/8"},
			skipCIDRs:    nil,
			upstreamIP:   "192.168.1.1:12345",
			wantPolicy:   proxyproto.REJECT,
		},
		{
			name:         "MultipleTrustedCIDRs_IPInSecondRange",
			trustedCIDRs: []string{"10.0.0.0/8", "172.16.0.0/12"},
			skipCIDRs:    nil,
			upstreamIP:   "172.20.1.1:12345",
			wantPolicy:   proxyproto.USE,
		},
		{
			name:         "SkipCIDR_IPInRange",
			trustedCIDRs: []string{"10.0.0.0/8"},
			skipCIDRs:    []string{"10.244.0.0/16"},
			upstreamIP:   "10.244.1.1:12345",
			wantPolicy:   proxyproto.SKIP,
		},
		{
			name:         "SkipCIDR_IPNotInRange_ButInTrusted",
			trustedCIDRs: []string{"10.0.0.0/8"},
			skipCIDRs:    []string{"10.244.0.0/16"},
			upstreamIP:   "10.1.2.3:12345",
			wantPolicy:   proxyproto.USE,
		},
		{
			name:         "SkipCIDR_NoTrusted_TrustAll",
			trustedCIDRs: nil,
			skipCIDRs:    []string{"10.244.0.0/16"},
			upstreamIP:   "192.168.1.1:12345",
			wantPolicy:   proxyproto.USE,
		},
		{
			name:         "SkipCIDR_NoTrusted_IPInSkip",
			trustedCIDRs: nil,
			skipCIDRs:    []string{"10.244.0.0/16"},
			upstreamIP:   "10.244.5.5:12345",
			wantPolicy:   proxyproto.SKIP,
		},
		{
			name:         "IPv6_TrustAll",
			trustedCIDRs: nil,
			skipCIDRs:    nil,
			upstreamIP:   "[2001:db8::1]:12345",
			wantPolicy:   proxyproto.USE,
		},
		{
			name:         "IPv6_InTrustedRange",
			trustedCIDRs: []string{"2001:db8::/32"},
			skipCIDRs:    nil,
			upstreamIP:   "[2001:db8::1]:12345",
			wantPolicy:   proxyproto.USE,
		},
		{
			name:         "IPv6_NotInTrustedRange",
			trustedCIDRs: []string{"2001:db8::/32"},
			skipCIDRs:    nil,
			upstreamIP:   "[2001:db9::1]:12345",
			wantPolicy:   proxyproto.REJECT,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg := config.NewDefaultConfig()
			cfg.EnableProxyProtocol = true
			cfg.ProxyProtocolTrustedCIDRs = tt.trustedCIDRs
			cfg.ProxyProtocolSkipCIDRs = tt.skipCIDRs

			policyFunc := cfg.ProxyProtocolConnPolicy()

			upstream, err := net.ResolveTCPAddr("tcp", tt.upstreamIP)
			if err != nil {
				t.Fatalf("Failed to resolve upstream address %s: %v", tt.upstreamIP, err)
			}

			opts := proxyproto.ConnPolicyOptions{
				Upstream: upstream,
			}

			policy, err := policyFunc(opts)
			if err != nil {
				t.Fatalf("ConnPolicy returned error: %v", err)
			}

			if policy != tt.wantPolicy {
				t.Errorf("ConnPolicy() = %v, want %v", policy, tt.wantPolicy)
			}
		})
	}
}

func TestProxyProtocolConnPolicy_NilUpstream(t *testing.T) {
	cfg := config.NewDefaultConfig()
	cfg.EnableProxyProtocol = true
	cfg.ProxyProtocolTrustedCIDRs = []string{"10.0.0.0/8"}

	policyFunc := cfg.ProxyProtocolConnPolicy()

	opts := proxyproto.ConnPolicyOptions{
		Upstream: nil,
	}

	policy, _ := policyFunc(opts)
	if policy != proxyproto.REJECT {
		t.Errorf("ConnPolicy() with nil upstream = %v, want REJECT", policy)
	}
}

func TestLoadProxyProtocolConfig(t *testing.T) {
	t.Run("LoadWithProxyProtocolEnabled", func(t *testing.T) {
		t.Setenv("ENABLE_PROXY_PROTOCOL", "true")
		t.Setenv("PROXY_PROTOCOL_TRUSTED_CIDRS", "10.0.0.0/8,172.16.0.0/12")
		t.Setenv("PROXY_PROTOCOL_SKIP_CIDRS", "10.244.0.0/16")

		cfg, err := config.Load()
		if err != nil {
			t.Fatalf("Load() failed: %v", err)
		}

		if !cfg.EnableProxyProtocol {
			t.Error("EnableProxyProtocol = false, want true")
		}

		if len(cfg.ProxyProtocolTrustedCIDRs) != 2 {
			t.Errorf("ProxyProtocolTrustedCIDRs length = %d, want 2", len(cfg.ProxyProtocolTrustedCIDRs))
		}

		if len(cfg.ProxyProtocolSkipCIDRs) != 1 {
			t.Errorf("ProxyProtocolSkipCIDRs length = %d, want 1", len(cfg.ProxyProtocolSkipCIDRs))
		}
	})

	t.Run("LoadWithProxyProtocolDisabled", func(t *testing.T) {
		t.Setenv("ENABLE_PROXY_PROTOCOL", "false")

		cfg, err := config.Load()
		if err != nil {
			t.Fatalf("Load() failed: %v", err)
		}

		if cfg.EnableProxyProtocol {
			t.Error("EnableProxyProtocol = true, want false")
		}
	})
}
