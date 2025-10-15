package types

import (
	"testing"
	"time"

	"sigs.k8s.io/yaml"
)

const sampleConfigMapData = `version: v1
sealos:
  address: "http://sealos.hub.local:5000"
  auth:
    username: "1"
    password: "2"
registries:
  - address: "https://registry-1.docker.io"
    auth:
      username: "3"
      password: "4"
reloadInterval: 5s
`

func TestMergeShimConfig(t *testing.T) {
	cfg := &Config{}
	spec := new(registryConfigSpec)
	if err := yaml.Unmarshal([]byte(sampleConfigMapData), spec); err != nil {
		t.Fatalf("failed to unmarshal sample config: %v", err)
	}
	mergeShimConfig(cfg, spec)

	if cfg.Address != "http://sealos.hub.local:5000" {
		t.Fatalf("unexpected address: %s", cfg.Address)
	}
	if cfg.Auth != "1:2" {
		t.Fatalf("unexpected auth: %s", cfg.Auth)
	}
	if len(cfg.Registries) != 1 {
		t.Fatalf("expected 1 registry, got %d", len(cfg.Registries))
	}
	if entry := cfg.Registries[0]; entry.Address != "https://registry-1.docker.io" || entry.Auth != "3:4" {
		t.Fatalf("unexpected registry entry: %+v", entry)
	}
	if cfg.ReloadInterval.Duration != 5*time.Second {
		t.Fatalf("expected reload interval 5s, got %s", cfg.ReloadInterval.Duration)
	}
	if cfg.Timeout.Duration <= 0 {
		t.Fatalf("expected timeout to be set, got %s", cfg.Timeout.Duration)
	}
}

func TestMergeShimConfigKeepsDefaults(t *testing.T) {
	cfg := &Config{Address: "keep", Auth: "keep"}
	spec := &registryConfigSpec{}
	mergeShimConfig(cfg, spec)
	if cfg.Address != "keep" {
		t.Fatalf("expected address to stay unchanged")
	}
	if cfg.Auth != "keep" {
		t.Fatalf("expected auth to stay unchanged")
	}
	if cfg.ReloadInterval.Duration != DefaultReloadInterval {
		t.Fatalf("expected default reload interval, got %s", cfg.ReloadInterval.Duration)
	}
	if cfg.Timeout.Duration <= 0 {
		t.Fatalf("expected default timeout, got %s", cfg.Timeout.Duration)
	}
}
