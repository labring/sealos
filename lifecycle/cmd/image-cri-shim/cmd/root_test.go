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
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	done := make(chan error, 1)
	go func() {
		done <- watchAuthConfig(ctx, cfgPath, shim, 10*time.Millisecond)
	}()

	time.Sleep(20 * time.Millisecond)

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

	select {
	case auth = <-shim.updates:
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for mirror auth update")
	}

	mirror, ok = auth.CRIConfigs["mirror.example.com"]
	if !ok {
		t.Fatalf(
			"expected registry credentials for mirror.example.com after update, got %#v",
			auth.CRIConfigs,
		)
	}
	if mirror.Password != "changed" {
		t.Fatalf("expected updated mirror password, got %q", mirror.Password)
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
