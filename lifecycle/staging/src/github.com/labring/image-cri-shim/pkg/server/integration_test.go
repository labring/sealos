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

package server

import (
	"testing"
	"time"

	rtype "github.com/docker/docker/api/types/registry"

	"github.com/labring/image-cri-shim/pkg/types"
)

func TestConfigurationUpdateInvalidatesCache(t *testing.T) {
	withManifestStub(t, func(stub *manifestStub) {
		store := NewAuthStore(&types.ShimAuthConfig{
			CRIConfigs: map[string]rtype.AuthConfig{
				"registry.example.com": {ServerAddress: "https://registry.example.com"},
			},
		})
		service := newV1ImageService(nil, store, CacheOptions{})
		service.setMaxCacheSize(4)
		service.cacheTTL = 500 * time.Millisecond

		image := "registry.example.com/app/nginx:1.0"
		first, found, _ := service.rewriteImage(image, "pull")
		if !found {
			t.Fatalf("expected initial rewrite to succeed")
		}
		if domain := extractDomainFromImage(first); domain != "registry.example.com" {
			t.Fatalf("expected initial domain registry.example.com, got %s", domain)
		}

		store.Update(&types.ShimAuthConfig{
			CRIConfigs: map[string]rtype.AuthConfig{
				"mirror.example.com": {ServerAddress: "https://mirror.example.com"},
			},
		})

		second, found, _ := service.rewriteImage(image, "pull")
		if !found {
			t.Fatalf("expected rewrite after update to succeed")
		}
		if domain := extractDomainFromImage(second); domain != "mirror.example.com" {
			t.Fatalf("expected rewritten image to use updated domain, got %s", domain)
		}
		if count := stub.callCount(image); count != 2 {
			t.Fatalf("expected cache invalidation to force new manifest call, got %d", count)
		}
	})
}
