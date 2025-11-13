// Copyright © 2025 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package types

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/kubernetes/fake"
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
cache:
  imageCacheSize: 2048
  imageCacheTTL: 45m
  domainCacheTTL: 15m
  statsLogInterval: 120s
  disableStats: true
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
	if cfg.Cache.ImageCacheSize != 2048 {
		t.Fatalf("expected cache size 2048, got %d", cfg.Cache.ImageCacheSize)
	}
	if cfg.Cache.ImageCacheTTL.Duration != 45*time.Minute {
		t.Fatalf("expected image cache ttl 45m, got %s", cfg.Cache.ImageCacheTTL.Duration)
	}
	if cfg.Cache.DomainCacheTTL.Duration != 15*time.Minute {
		t.Fatalf("expected domain cache ttl 15m, got %s", cfg.Cache.DomainCacheTTL.Duration)
	}
	if cfg.Cache.DisableStats != true {
		t.Fatalf("expected disableStats true")
	}
	if cfg.Cache.StatsLogInterval.Duration != 0 {
		t.Fatalf("expected stats interval 0 due to disableStats, got %s", cfg.Cache.StatsLogInterval.Duration)
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

func TestSyncConfigFromConfigMapWritesFile(t *testing.T) {
	cfg := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{Name: shimConfigMapName, Namespace: shimConfigMapNamespace},
		Data:       map[string]string{shimConfigMapDataKey: sampleConfigMapData},
	}
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "image-cri-shim.yaml")
	initial := []byte("shim: /var/run/image-cri-shim.sock\ncri: /run/containerd/containerd.sock\n")
	if err := os.WriteFile(configPath, initial, 0o600); err != nil {
		t.Fatalf("failed to seed config file: %v", err)
	}

	originalFactory := kubeClientFactory
	kubeClientFactory = func() (kubernetes.Interface, error) {
		return fake.NewSimpleClientset(cfg), nil
	}
	t.Cleanup(func() { kubeClientFactory = originalFactory })

	SyncConfigFromConfigMap(context.Background(), configPath)

	merged, err := Unmarshal(configPath)
	if err != nil {
		t.Fatalf("failed to read merged config: %v", err)
	}
	if merged.Address != "http://sealos.hub.local:5000" {
		t.Fatalf("unexpected address: %s", merged.Address)
	}
	if merged.Auth != "1:2" {
		t.Fatalf("unexpected auth: %s", merged.Auth)
	}
	if len(merged.Registries) != 1 || merged.Registries[0].Address != "https://registry-1.docker.io" {
		t.Fatalf("unexpected registries: %+v", merged.Registries)
	}
	if merged.ReloadInterval.Duration != 5*time.Second {
		t.Fatalf("unexpected reload interval: %s", merged.ReloadInterval.Duration)
	}
	if merged.Timeout.Duration != 15*time.Minute {
		t.Fatalf("unexpected timeout: %s", merged.Timeout.Duration)
	}
	if merged.Cache.ImageCacheSize != 2048 {
		t.Fatalf("unexpected cache size: %d", merged.Cache.ImageCacheSize)
	}
	if merged.Cache.ImageCacheTTL.Duration != 45*time.Minute {
		t.Fatalf("unexpected cache ttl: %s", merged.Cache.ImageCacheTTL.Duration)
	}
	if merged.Cache.DomainCacheTTL.Duration != 15*time.Minute {
		t.Fatalf("unexpected domain cache ttl: %s", merged.Cache.DomainCacheTTL.Duration)
	}
	if !merged.Cache.DisableStats {
		t.Fatalf("expected stats disabled")
	}
	if merged.Cache.StatsLogInterval.Duration != 0 {
		t.Fatalf("expected stats interval 0, got %s", merged.Cache.StatsLogInterval.Duration)
	}
}

func TestSyncConfigFromConfigMapMissingData(t *testing.T) {
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "image-cri-shim.yaml")
	initial := []byte("shim: /var/run/image-cri-shim.sock\n")
	if err := os.WriteFile(configPath, initial, 0o600); err != nil {
		t.Fatalf("failed to seed config file: %v", err)
	}

	originalFactory := kubeClientFactory
	kubeClientFactory = func() (kubernetes.Interface, error) {
		return fake.NewSimpleClientset(), nil
	}
	t.Cleanup(func() { kubeClientFactory = originalFactory })

	SyncConfigFromConfigMap(context.Background(), configPath)

	data, err := os.ReadFile(configPath)
	if err != nil {
		t.Fatalf("failed to read config file: %v", err)
	}
	if string(data) != string(initial) {
		t.Fatalf("expected config file to remain unchanged")
	}
}
