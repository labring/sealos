/*
Copyright 2022 cuisongliu@qq.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package types

import (
	"os"
	"path/filepath"
	"testing"

	"sigs.k8s.io/yaml"
)

func TestUnmarshal(t *testing.T) {
	cfg, err := Unmarshal("testdata/image-cri-shim.yaml")
	if err != nil {
		t.Error(err)
		return
	}
	auth, err := cfg.PreProcess()
	if err != nil {
		t.Error(err)
		return
	}
	if _, ok := auth.CRIConfigs["192.168.64.1:5000"]; !ok {
		t.Fatalf("expected registry credentials loaded from registry.d, got %#v", auth.CRIConfigs)
	}
}

func TestRegistriesLoadedFromDir(t *testing.T) {
	dir := t.TempDir()
	cfg := &Config{
		ImageShimSocket: "/var/run/image-cri-shim.sock",
		RuntimeSocket:   "/run/containerd/containerd.sock",
		Address:         "http://sealos.hub:5000",
		Force:           true,
		Auth:            "offline:user",
		RegistryDir:     dir,
	}

	entries := map[string]Registry{
		"192.168.64.1:5000.yaml":  {Address: "http://192.168.64.1:5000", Auth: "admin:passw0rd"},
		"public.example.com.yaml": {Address: "https://public.example.com"},
	}
	for name, reg := range entries {
		data, err := yaml.Marshal(reg)
		if err != nil {
			t.Fatalf("failed to marshal registry %s: %v", name, err)
		}
		if err := os.WriteFile(filepath.Join(dir, name), data, 0o644); err != nil {
			t.Fatalf("failed to write registry file %s: %v", name, err)
		}
	}

	auth, err := cfg.PreProcess()
	if err != nil {
		t.Fatalf("preprocess failed: %v", err)
	}

	if !auth.SkipLoginRegistries["public.example.com"] {
		t.Fatalf("expected public.example.com to skip login, got %#v", auth.SkipLoginRegistries)
	}
	if authCfg, ok := auth.CRIConfigs["192.168.64.1:5000"]; !ok || authCfg.Username != "admin" || authCfg.Password != "passw0rd" {
		t.Fatalf("expected credentials for 192.168.64.1:5000, got %#v", auth.CRIConfigs["192.168.64.1:5000"])
	}
}

func TestRegistriesFieldSyncedToDir(t *testing.T) {
	dir := t.TempDir()
	registries := []Registry{
		{Address: "https://hub.192.168.64.4.nip.io", Auth: "admin:syncpass"},
		{Address: "http://192.168.64.1:5000"},
	}

	cfg := &Config{
		ImageShimSocket: "/var/run/image-cri-shim.sock",
		RuntimeSocket:   "/run/containerd/containerd.sock",
		Address:         "https://registry.internal",
		Force:           true,
		Auth:            "sync:user",
		RegistryDir:     dir,
		Registries:      registries,
	}

	auth, err := cfg.PreProcess()
	if err != nil {
		t.Fatalf("preprocess with inline registries failed: %v", err)
	}

	expectedFiles := map[string]Registry{
		"hub.192.168.64.4.nip.io.yaml": registries[0],
		"192.168.64.1:5000.yaml":       registries[1],
	}
	for name, want := range expectedFiles {
		path := filepath.Join(dir, name)
		data, err := os.ReadFile(path)
		if err != nil {
			t.Fatalf("expected registry file %s to be written: %v", path, err)
		}
		var got Registry
		if err := yaml.Unmarshal(data, &got); err != nil {
			t.Fatalf("failed to parse registry file %s: %v", path, err)
		}
		if got != want {
			t.Fatalf("registry file %s content mismatch: got %#v, want %#v", path, got, want)
		}
	}

	firstDomain := registryMatchDomain(registries[0])
	if authCfg, ok := auth.CRIConfigs[firstDomain]; !ok || authCfg.Username != "admin" || authCfg.Password != "syncpass" {
		t.Fatalf("expected credentials for %s, got %#v", firstDomain, auth.CRIConfigs[firstDomain])
	}

	secondDomain := registryMatchDomain(registries[1])
	if !auth.SkipLoginRegistries[secondDomain] {
		t.Fatalf("expected %s to skip login, got %#v", secondDomain, auth.SkipLoginRegistries)
	}
}
