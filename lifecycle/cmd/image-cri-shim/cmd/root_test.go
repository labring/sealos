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
	"context"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/labring/image-cri-shim/pkg/types"
)

type fakeShim struct {
	updates chan *types.ShimAuthConfig
}

func newFakeShim() *fakeShim {
	return &fakeShim{updates: make(chan *types.ShimAuthConfig, 1)}
}

func (f *fakeShim) Setup() error { return nil }

func (f *fakeShim) Start() error { return nil }

func (f *fakeShim) Stop() {}

func (f *fakeShim) UpdateAuth(auth *types.ShimAuthConfig) {
	select {
	case f.updates <- auth:
	default:
	}
}

func TestWatchAuthConfigReloads(t *testing.T) {
	dir := t.TempDir()
	cfgPath := filepath.Join(dir, "shim-config.yaml")
	registryDir := filepath.Join(dir, "registry.d")

	if err := os.MkdirAll(registryDir, 0o755); err != nil {
		t.Fatalf("failed to create registry.d directory: %v", err)
	}

	mirrorPath := filepath.Join(registryDir, "mirror.yaml")
	if err := os.WriteFile(mirrorPath, []byte("address: \"https://mirror.example.com\"\nauth: \"user:pass\"\n"), 0o644); err != nil {
		t.Fatalf("failed to write mirror registry config: %v", err)
	}
	if err := os.WriteFile(filepath.Join(registryDir, "public.yaml"), []byte("address: \"https://public.example.com\"\n"), 0o644); err != nil {
		t.Fatalf("failed to write public registry config: %v", err)
	}

	initialConfig := []byte(fmt.Sprintf(`shim: "/tmp/test.sock"
cri: "/var/run/containerd/containerd.sock"
address: "https://example.com"
force: true
auth: "offline:initial"
reloadInterval: 10ms
registry.d: %q
`, registryDir))

	if err := os.WriteFile(cfgPath, initialConfig, 0o644); err != nil {
		t.Fatalf("failed to write initial config: %v", err)
	}

	shim := newFakeShim()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	done := make(chan error, 1)
	go func() {
		done <- watchAuthConfig(ctx, cfgPath, shim, 10*time.Millisecond)
	}()

	time.Sleep(20 * time.Millisecond)

	updatedConfig := []byte(fmt.Sprintf(`shim: "/tmp/test.sock"
cri: "/var/run/containerd/containerd.sock"
address: "https://example.com"
force: true
auth: "offline:updated"
reloadInterval: 10ms
registry.d: %q
`, registryDir))

	if err := os.WriteFile(cfgPath, updatedConfig, 0o644); err != nil {
		t.Fatalf("failed to write updated config: %v", err)
	}

	var auth *types.ShimAuthConfig
	select {
	case auth = <-shim.updates:
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for auth update")
	}

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
		t.Fatalf("expected initial password from registry.d, got %q", mirror.Password)
	}

	if !auth.SkipLoginRegistries["public.example.com"] {
		t.Fatalf("expected public.example.com to skip login, got %#v", auth.SkipLoginRegistries)
	}
	if cfg, ok := auth.CRIConfigs["public.example.com"]; !ok || cfg.Username != "" || cfg.Password != "" {
		t.Fatalf("expected public.example.com to use anonymous credentials, got %#v", cfg)
	}

	if err := os.WriteFile(mirrorPath, []byte("address: \"https://mirror.example.com\"\nauth: \"user:changed\"\n"), 0o644); err != nil {
		t.Fatalf("failed to write updated mirror registry config: %v", err)
	}

	select {
	case auth = <-shim.updates:
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for registry.d auth update")
	}

	mirror, ok = auth.CRIConfigs["mirror.example.com"]
	if !ok {
		t.Fatalf("expected registry credentials for mirror.example.com after update, got %#v", auth.CRIConfigs)
	}
	if mirror.Password != "changed" {
		t.Fatalf("expected updated password from registry.d, got %q", mirror.Password)
	}

	cancel()

	select {
	case err := <-done:
		if err != nil {
			t.Fatalf("watcher exited with error: %v", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("watcher did not exit after context cancel")
	}
}
