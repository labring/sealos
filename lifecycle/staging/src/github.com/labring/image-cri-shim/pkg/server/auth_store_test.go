package server

import (
	"testing"

	rtype "github.com/docker/docker/api/types/registry"
	"github.com/labring/image-cri-shim/pkg/types"
)

func TestAuthStoreUpdateAndGet(t *testing.T) {
	initial := &types.ShimAuthConfig{
		CRIConfigs: map[string]rtype.AuthConfig{
			"registry.example.com": {
				Username:      "alice",
				Password:      "secret",
				ServerAddress: "https://registry.example.com",
			},
			"mirror.example.com": {
				ServerAddress: "https://mirror.example.com",
			},
		},
		OfflineCRIConfigs: map[string]rtype.AuthConfig{
			"example.com": {
				Username:      "offline",
				Password:      "init",
				ServerAddress: "https://example.com",
			},
		},
		SkipLoginRegistries: map[string]bool{
			"mirror.example.com": true,
		},
	}

	store := NewAuthStore(initial)

	if cfg, ok := store.GetCRIConfig("registry.example.com"); !ok || cfg.Username != "alice" {
		t.Fatalf("unexpected registry credentials: %#v, ok=%v", cfg, ok)
	}

	if !store.ShouldSkipLogin("mirror.example.com") {
		t.Fatalf("expected mirror.example.com to skip login")
	}

	registries, skip := store.GetCRIConfigs()
	if _, ok := registries["registry.example.com"]; !ok {
		t.Fatalf("expected registry.example.com to be present in GetCRIConfigs")
	}
	skip["mirror.example.com"] = false
	if !store.ShouldSkipLogin("mirror.example.com") {
		t.Fatalf("mutating returned skip map should not affect store state")
	}

	offline := store.GetOfflineConfigs()
	offline["example.com"] = rtype.AuthConfig{Username: "mutated"}

	if cfg, _ := store.GetOfflineConfigs()["example.com"]; cfg.Username != "offline" {
		t.Fatalf("expected offline cache to be immutable, got %#v", cfg)
	}

	store.Update(nil)

	if _, ok := store.GetCRIConfig("registry.example.com"); ok {
		t.Fatalf("expected registry credentials to be cleared after nil update")
	}

	if store.ShouldSkipLogin("mirror.example.com") {
		t.Fatalf("expected skip login map to be cleared after nil update")
	}

	if len(store.GetOfflineConfigs()) != 0 {
		t.Fatalf("expected offline credentials to be cleared after nil update")
	}
}
