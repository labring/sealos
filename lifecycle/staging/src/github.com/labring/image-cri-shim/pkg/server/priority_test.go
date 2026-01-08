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

func TestAuthStore_GetSortedRegistries(t *testing.T) {
	tests := []struct {
		name              string
		authConfig        *types.ShimAuthConfig
		expectedCount     int
		expectedFirst     string
		expectedLast      string
		expectedPriorities map[string]int
	}{
		{
			name: "mixed priorities with sealos.hub highest",
			authConfig: &types.ShimAuthConfig{
				CRIConfigs: map[string]rtype.AuthConfig{
					"docker.io":        {ServerAddress: "docker.io", Username: "user1", Password: "pass1"},
					"registry.example.com": {ServerAddress: "registry.example.com", Username: "user2", Password: "pass2"},
				},
				CRIPriorities: map[string]int{
					"docker.io":              500, // default
					"registry.example.com":   800, // higher than docker.io
				},
				OfflineCRIConfigs: map[string]rtype.AuthConfig{
					"sealos.hub": {ServerAddress: "sealos.hub", Username: "admin", Password: "passw0rd"},
				},
				OfflinePriority: types.SealosHubDefaultPriority, // 1000, highest
			},
			expectedCount: 3,
			expectedFirst: "sealos.hub", // highest priority (1000)
			expectedLast:  "docker.io",  // lowest priority (500)
			expectedPriorities: map[string]int{
				"sealos.hub":           1000,
				"registry.example.com": 800,
				"docker.io":            500,
			},
		},
		{
			name: "custom priority exceeds max",
			authConfig: &types.ShimAuthConfig{
				CRIConfigs: map[string]rtype.AuthConfig{
					"docker.io": {ServerAddress: "docker.io", Username: "user1", Password: "pass1"},
				},
				CRIPriorities: map[string]int{
					"docker.io": 1500, // exceeds MaxPriority (1000), but stored as-is in AuthStore
				},
				OfflineCRIConfigs: map[string]rtype.AuthConfig{
					"sealos.hub": {ServerAddress: "sealos.hub", Username: "admin", Password: "passw0rd"},
				},
				OfflinePriority: types.SealosHubDefaultPriority,
			},
			expectedCount: 2,
			// Note: priority > max is clamped in config.PreProcess(), not in AuthStore
			// This test verifies AuthStore stores and sorts the value as-is
			expectedFirst: "docker.io", // 1500 > 1000, so docker.io comes first
			expectedPriorities: map[string]int{
				"sealos.hub": 1000,
				"docker.io":  1500, // stored as-is (clamping happens in config.PreProcess)
			},
		},
		{
			name: "equal priorities - offline first",
			authConfig: &types.ShimAuthConfig{
				CRIConfigs: map[string]rtype.AuthConfig{
					"docker.io": {ServerAddress: "docker.io", Username: "user1", Password: "pass1"},
				},
				CRIPriorities: map[string]int{
					"docker.io": 1000, // same as sealos.hub
				},
				OfflineCRIConfigs: map[string]rtype.AuthConfig{
					"sealos.hub": {ServerAddress: "sealos.hub", Username: "admin", Password: "passw0rd"},
				},
				OfflinePriority: 1000, // same as docker.io
			},
			expectedCount: 2,
			expectedFirst: "sealos.hub", // offline registry comes first when priorities are equal
			expectedPriorities: map[string]int{
				"sealos.hub": 1000,
				"docker.io":  1000,
			},
		},
		{
			name: "zero priority uses default",
			authConfig: &types.ShimAuthConfig{
				CRIConfigs: map[string]rtype.AuthConfig{
					"docker.io": {ServerAddress: "docker.io", Username: "user1", Password: "pass1"},
				},
				CRIPriorities: map[string]int{
					"docker.io": 0, // zero, should use default in GetSortedRegistries
				},
				OfflineCRIConfigs: map[string]rtype.AuthConfig{
					"sealos.hub": {ServerAddress: "sealos.hub", Username: "admin", Password: "passw0rd"},
				},
				OfflinePriority: types.SealosHubDefaultPriority,
			},
			expectedCount: 2,
			expectedFirst: "sealos.hub",
			expectedPriorities: map[string]int{
				"sealos.hub": 1000,
				"docker.io":  500, // zero is replaced with default (500)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := NewAuthStore(tt.authConfig)
			entries := store.GetSortedRegistries()

			if len(entries) != tt.expectedCount {
				t.Errorf("expected %d registries, got %d", tt.expectedCount, len(entries))
			}

			if len(entries) > 0 {
				if entries[0].Domain != tt.expectedFirst {
					t.Errorf("expected first registry to be %s, got %s", tt.expectedFirst, entries[0].Domain)
				}
				if tt.expectedLast != "" && entries[len(entries)-1].Domain != tt.expectedLast {
					t.Errorf("expected last registry to be %s, got %s", tt.expectedLast, entries[len(entries)-1].Domain)
				}
			}

			// Verify priorities
			for _, entry := range entries {
				expectedPriority, ok := tt.expectedPriorities[entry.Domain]
				if !ok {
					t.Errorf("unexpected registry: %s", entry.Domain)
					continue
				}
				if entry.Priority != expectedPriority {
					t.Errorf("registry %s: expected priority %d, got %d", entry.Domain, expectedPriority, entry.Priority)
				}
			}

			// Verify ordering (priorities should be non-increasing)
			for i := 1; i < len(entries); i++ {
				if entries[i-1].Priority < entries[i].Priority {
					t.Errorf("priority order violation at index %d: %s (priority %d) should not come before %s (priority %d)",
						i-1, entries[i-1].Domain, entries[i-1].Priority, entries[i].Domain, entries[i].Priority)
				}
			}
		})
	}
}

func TestConfig_PriorityProcessing(t *testing.T) {
	tests := []struct {
		name              string
		configYAML        string
		expectedPriorities map[string]int
		expectError       bool
	}{
		{
			name: "valid priorities",
			configYAML: `
address: https://sealos.hub
auth: admin:passw0rd
registries:
  - address: docker.io
    auth: user1:pass1
    priority: 600
  - address: registry.example.com
    auth: user2:pass2
    priority: 800
`,
			expectedPriorities: map[string]int{
				"sealos.hub":           1000,
				"registry.example.com": 800,
				"index.docker.io":      600, // docker.io is normalized to index.docker.io
			},
			expectError: false,
		},
		{
			name: "missing priority uses default",
			configYAML: `
address: https://sealos.hub
auth: admin:passw0rd
registries:
  - address: docker.io
    auth: user1:pass1
  - address: registry.example.com
    auth: user2:pass2
    priority: 700
`,
			// When priority is 0 (not set in YAML), it's replaced with RegistryDefaultPriority (500)
			expectedPriorities: map[string]int{
				"sealos.hub":           1000,
				"registry.example.com": 700,
				"index.docker.io":      500, // default, docker.io is normalized
			},
			expectError: false,
		},
		{
			name: "priority below min is clamped",
			configYAML: `
address: https://sealos.hub
auth: admin:passw0rd
registries:
  - address: docker.io
    auth: user1:pass1
    priority: -100
`,
			expectedPriorities: map[string]int{
				"sealos.hub":      1000,
				"index.docker.io": 0, // clamped to MinPriority
			},
			expectError: false,
		},
		{
			name: "priority above max is clamped",
			configYAML: `
address: https://sealos.hub
auth: admin:passw0rd
registries:
  - address: docker.io
    auth: user1:pass1
    priority: 2000
`,
			expectedPriorities: map[string]int{
				"sealos.hub":      1000,
				"index.docker.io": 1000, // clamped to MaxPriority
			},
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cfg, err := types.UnmarshalData([]byte(tt.configYAML))
			if tt.expectError {
				if err == nil {
					t.Error("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			// Set runtime socket for PreProcess to succeed
			cfg.RuntimeSocket = "/tmp/fake-cri.sock"
			cfg.Force = true

			authConfig, err := cfg.PreProcess()
			if err != nil {
				t.Fatalf("PreProcess failed: %v", err)
			}

			// Verify offline priority
			if authConfig.OfflinePriority != tt.expectedPriorities["sealos.hub"] {
				t.Errorf("expected sealos.hub priority %d, got %d",
					tt.expectedPriorities["sealos.hub"], authConfig.OfflinePriority)
			}

			// Verify registry priorities
			for domain, expectedPriority := range tt.expectedPriorities {
				if domain == "sealos.hub" {
					continue // already checked
				}
				actualPriority := authConfig.CRIPriorities[domain]
				if actualPriority != expectedPriority {
					t.Errorf("registry %s: expected priority %d, got %d (all priorities: %+v)",
						domain, expectedPriority, actualPriority, authConfig.CRIPriorities)
				}
			}
		})
	}
}

func TestRegistryWithPriority(t *testing.T) {
	// This is a compile-time check to ensure RegistryWithPriority type is correctly defined
	_ = RegistryWithPriority{
		Domain:   "test.com",
		Config:   rtype.AuthConfig{Username: "user", Password: "pass"},
		Priority: 500,
	}
}
