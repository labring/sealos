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

	rtype "github.com/docker/docker/api/types/registry"

	"github.com/labring/image-cri-shim/pkg/types"
)

func BenchmarkRewriteImageNoCache(b *testing.B) {
	withManifestStub(b, func(_ *manifestStub) {
		service := newImageServiceForTest(&types.ShimAuthConfig{
			CRIConfigs: map[string]rtype.AuthConfig{
				"registry.example.com": {ServerAddress: "https://registry.example.com"},
			},
		})
		service.setMaxCacheSize(0)
		image := "registry.example.com/app/nginx:latest"

		b.ResetTimer()
		for i := 0; i < b.N; i++ {
			service.rewriteImage(image, "pull")
		}
	})
}

func BenchmarkRewriteImageCached(b *testing.B) {
	withManifestStub(b, func(_ *manifestStub) {
		service := newImageServiceForTest(&types.ShimAuthConfig{
			CRIConfigs: map[string]rtype.AuthConfig{
				"registry.example.com": {ServerAddress: "https://registry.example.com"},
			},
		})
		service.setMaxCacheSize(defaultImageCacheSize)
		image := "registry.example.com/app/nginx:latest"
		// warm cache
		service.rewriteImage(image, "pull")

		b.ResetTimer()
		for i := 0; i < b.N; i++ {
			service.rewriteImage(image, "pull")
		}
	})
}
