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

func TestRegistriesSyncToDir(t *testing.T) {
	dir := t.TempDir()
	cfg := &Config{
		ImageShimSocket: "/var/run/image-cri-shim.sock",
		RuntimeSocket:   "/run/containerd/containerd.sock",
		Address:         "http://sealos.hub:5000",
		Force:           true,
		Auth:            "offline:user",
		RegistryDir:     dir,
		Registries: []Registry{
			{Address: "http://192.168.64.1:5000", Auth: "admin:passw0rd"},
			{Address: "https://public.example.com"},
		},
	}

	auth, err := cfg.PreProcess()
	if err != nil {
		t.Fatalf("preprocess failed: %v", err)
	}

	expectedFiles := map[string]Registry{
		"192.168.64.1:5000.yaml":  {Address: "http://192.168.64.1:5000", Auth: "admin:passw0rd"},
		"public.example.com.yaml": {Address: "https://public.example.com"},
	}

	for name, want := range expectedFiles {
		path := filepath.Join(dir, name)
		data, err := os.ReadFile(path)
		if err != nil {
			t.Fatalf("expected registry file %s to exist: %v", name, err)
		}

		var got Registry
		if err := yaml.Unmarshal(data, &got); err != nil {
			t.Fatalf("failed to parse registry file %s: %v", name, err)
		}
		if got != want {
			t.Fatalf("unexpected registry file contents for %s: got %#v want %#v", name, got, want)
		}
	}

	if !auth.SkipLoginRegistries["public.example.com"] {
		t.Fatalf("expected public.example.com to skip login, got %#v", auth.SkipLoginRegistries)
	}

	if cfg.Registries == nil || len(cfg.Registries) != 2 {
		t.Fatalf("expected 2 registries after preprocessing, got %#v", cfg.Registries)
	}
}
