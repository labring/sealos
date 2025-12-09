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

package cmd

import (
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/labring/image-cri-shim/pkg/shim"
	"github.com/labring/image-cri-shim/pkg/types"
)

type fakeShim struct {
	updates chan *types.ShimAuthConfig
	mu      sync.Mutex
	last    *types.ShimAuthConfig
}

func newFakeShim() *fakeShim {
	return &fakeShim{updates: make(chan *types.ShimAuthConfig, 1)}
}

func (f *fakeShim) Setup() error { return nil }

func (f *fakeShim) Start() error { return nil }

func (f *fakeShim) Stop() {}

func (f *fakeShim) UpdateAuth(auth *types.ShimAuthConfig) {
	f.mu.Lock()
	f.last = auth
	f.mu.Unlock()
	select {
	case f.updates <- auth:
	default:
	}
}

func (f *fakeShim) UpdateCache(_ shim.CacheOptions) {}

func (f *fakeShim) CacheStats() shim.CacheStats { return shim.CacheStats{} }

func (f *fakeShim) latest() *types.ShimAuthConfig {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.last
}

func waitForAuthUpdate(t *testing.T, sh *fakeShim, timeout time.Duration) *types.ShimAuthConfig {
	t.Helper()
	deadline := time.Now().Add(timeout)
	var last *types.ShimAuthConfig
	for time.Now().Before(deadline) {
		for {
			select {
			case auth := <-sh.updates:
				last = auth
			default:
				goto drained
			}
		}
	drained:
		if latest := sh.latest(); latest != nil {
			last = latest
		}
		if last != nil {
			return last
		}
		select {
		default:
			time.Sleep(10 * time.Millisecond)
		}
	}
	t.Fatalf("timed out waiting for auth update")
	return nil
}

func TestWatchAuthConfigReloads(t *testing.T) {
	dir := t.TempDir()
	cfgPath := filepath.Join(dir, "shim-config.yaml")

	initialConfig := []byte(`shim: "/tmp/test.sock"
cri: "/var/run/containerd/containerd.sock"
address: "https://example.com"
force: true
auth: "offline:initial"
reloadInterval: 10ms
registries:
- address: "https://mirror.example.com"
  auth: "user:pass"
- address: "https://public.example.com"
`)

	if err := os.WriteFile(cfgPath, initialConfig, 0o644); err != nil {
		t.Fatalf("failed to write initial config: %v", err)
	}

	shim := newFakeShim()
	reloadConfig(t, cfgPath, shim)

	updatedConfig := []byte(`shim: "/tmp/test.sock"
cri: "/var/run/containerd/containerd.sock"
address: "https://example.com"
force: true
auth: "offline:updated"
reloadInterval: 10ms
registries:
- address: "https://mirror.example.com"
  auth: "user:pass"
- address: "https://public.example.com"
`)

	if err := os.WriteFile(cfgPath, updatedConfig, 0o644); err != nil {
		t.Fatalf("failed to write updated config: %v", err)
	}

	reloadConfig(t, cfgPath, shim)
	auth := waitForAuthUpdate(t, shim, 3*time.Second)

	offline, ok := auth.OfflineCRIConfigs["example.com"]
	if !ok {
		t.Fatalf("expected offline auth for example.com, got %#v", auth.OfflineCRIConfigs)
	}
	if offline.Password != "updated" {
		t.Fatalf("expected updated password, got %q", offline.Password)
	}

	mirror, ok := auth.CRIConfigs["mirror.example.com"]
	if !ok {
		t.Fatalf("expected registry credentials for mirror.example.com, got %#v", auth.CRIConfigs)
	}
	if mirror.Password != "pass" {
		t.Fatalf("expected initial mirror password, got %q", mirror.Password)
	}

	if !auth.SkipLoginRegistries["public.example.com"] {
		t.Fatalf("expected public.example.com to skip login, got %#v", auth.SkipLoginRegistries)
	}

	// update mirror credentials via config file
	mirrorUpdated := []byte(`shim: "/tmp/test.sock"
cri: "/var/run/containerd/containerd.sock"
address: "https://example.com"
force: true
auth: "offline:updated"
reloadInterval: 10ms
registries:
- address: "https://mirror.example.com"
  auth: "user:changed"
- address: "https://public.example.com"
`)

	if err := os.WriteFile(cfgPath, mirrorUpdated, 0o644); err != nil {
		t.Fatalf("failed to write mirror update: %v", err)
	}

	reloadConfig(t, cfgPath, shim)
	auth = waitForAuthUpdate(t, shim, 3*time.Second)

	mirror, ok = auth.CRIConfigs["mirror.example.com"]
	if !ok {
		t.Fatalf("expected registry credentials for mirror.example.com after update, got %#v", auth.CRIConfigs)
	}
	if mirror.Password != "changed" {
		t.Fatalf("expected updated mirror password, got %q", mirror.Password)
	}

}

func reloadConfig(t *testing.T, cfgPath string, sh *fakeShim) {
	t.Helper()
	data, err := os.ReadFile(cfgPath)
	if err != nil {
		t.Fatalf("failed to read config: %v", err)
	}
	cfg, err := types.UnmarshalData(data)
	if err != nil {
		t.Fatalf("failed to parse config: %v", err)
	}
	auth, err := cfg.PreProcess()
	if err != nil {
		t.Fatalf("failed to preprocess config: %v", err)
	}
	sh.UpdateAuth(auth)
	sh.UpdateCache(shim.CacheOptionsFromConfig(cfg))
}
