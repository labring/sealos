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
	"testing"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestUnmarshal(t *testing.T) {
	cfg, err := Unmarshal("testdata/image-cri-shim.yaml")
	if err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}

	if len(cfg.Registries) == 0 {
		t.Fatalf("expected registries from config, got %#v", cfg.Registries)
	}

	auth, err := cfg.PreProcess()
	if err != nil {
		t.Fatalf("preprocess failed: %v", err)
	}

	mirror, ok := auth.CRIConfigs["mirror.example.com"]
	if !ok {
		t.Fatalf("expected registry credentials for mirror.example.com, got %#v", auth.CRIConfigs)
	}
	if mirror.Username != "admin" || mirror.Password != "passw0rd" {
		t.Fatalf("unexpected credentials for mirror.example.com, got %#v", mirror)
	}

	if !auth.SkipLoginRegistries["public.example.com"] {
		t.Fatalf("expected public.example.com to skip login, got %#v", auth.SkipLoginRegistries)
	}
}

func TestInlineRegistriesPreProcess(t *testing.T) {
	cfg := &Config{
		ImageShimSocket: "/var/run/image-cri-shim.sock",
		RuntimeSocket:   "/run/containerd/containerd.sock",
		Address:         "https://registry.internal",
		Force:           true,
		Auth:            "offline:user",
		Registries: []Registry{
			{Address: "https://mirror.internal", Auth: "admin:syncpass"},
			{Address: "https://public.example.com"},
		},
	}

	auth, err := cfg.PreProcess()
	if err != nil {
		t.Fatalf("preprocess failed: %v", err)
	}

	mirrorDomain := registryMatchDomain(cfg.Registries[0])
	mirror, ok := auth.CRIConfigs[mirrorDomain]
	if !ok {
		t.Fatalf("expected registry credentials for %s, got %#v", mirrorDomain, auth.CRIConfigs)
	}
	if mirror.Username != "admin" || mirror.Password != "syncpass" {
		t.Fatalf("unexpected credentials for %s, got %#v", mirrorDomain, mirror)
	}

	publicDomain := registryMatchDomain(cfg.Registries[1])
	if !auth.SkipLoginRegistries[publicDomain] {
		t.Fatalf("expected %s to skip login, got %#v", publicDomain, auth.SkipLoginRegistries)
	}
}

func TestCacheConfigNormalize(t *testing.T) {
	cases := []struct {
		name     string
		in       CacheConfig
		expected CacheConfig
	}{
		{
			name: "defaults applied",
			in:   CacheConfig{},
			expected: CacheConfig{
				ImageCacheSize:   defaultImageCacheSize,
				ImageCacheTTL:    metav1.Duration{Duration: defaultImageCacheTTL},
				DomainCacheTTL:   metav1.Duration{Duration: defaultDomainCacheTTL},
				StatsLogInterval: metav1.Duration{Duration: defaultCacheStatsInterval},
			},
		},
		{
			name: "disable stats respected",
			in: CacheConfig{
				ImageCacheSize: 512,
				DisableStats:   true,
			},
			expected: CacheConfig{
				ImageCacheSize: 512,
				ImageCacheTTL:  metav1.Duration{Duration: defaultImageCacheTTL},
				DomainCacheTTL: metav1.Duration{Duration: defaultDomainCacheTTL},
				DisableStats:   true,
			},
		},
		{
			name: "negative size disables cache",
			in: CacheConfig{
				ImageCacheSize: -10,
			},
			expected: CacheConfig{
				ImageCacheSize:   0,
				ImageCacheTTL:    metav1.Duration{Duration: defaultImageCacheTTL},
				DomainCacheTTL:   metav1.Duration{Duration: defaultDomainCacheTTL},
				StatsLogInterval: metav1.Duration{Duration: defaultCacheStatsInterval},
			},
		},
	}

	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			cfg := tt.in
			cfg.normalize()
			if cfg.ImageCacheSize != tt.expected.ImageCacheSize ||
				cfg.ImageCacheTTL != tt.expected.ImageCacheTTL ||
				cfg.DomainCacheTTL != tt.expected.DomainCacheTTL ||
				cfg.DisableStats != tt.expected.DisableStats ||
				cfg.StatsLogInterval != tt.expected.StatsLogInterval {
				t.Fatalf("expected %+v, got %+v", tt.expected, cfg)
			}
		})
	}
}
