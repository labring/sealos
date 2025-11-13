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
