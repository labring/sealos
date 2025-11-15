/*
Copyright 2024 cuisongliu@qq.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://github.com/labring/sealos/blob/main/LICENSE.md

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

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

	registries := store.GetCRIConfigs()
	if _, ok := registries["registry.example.com"]; !ok {
		t.Fatalf("expected registry.example.com to be present in GetCRIConfigs")
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

	if len(store.GetOfflineConfigs()) != 0 {
		t.Fatalf("expected offline credentials to be cleared after nil update")
	}
}

func TestAuthStoreObservers(t *testing.T) {
	store := NewAuthStore(nil)
	calls := 0
	store.AddObserver(func() { calls++ })

	store.Update(&types.ShimAuthConfig{
		CRIConfigs: map[string]rtype.AuthConfig{
			"registry.example.com": {ServerAddress: "https://registry.example.com"},
		},
	})
	if calls != 1 {
		t.Fatalf("expected observer to fire once, got %d", calls)
	}

	store.Update(nil)
	if calls != 2 {
		t.Fatalf("expected observer to fire on nil update, got %d", calls)
	}
}
