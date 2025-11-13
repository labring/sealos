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
		service := newV1ImageService(nil, store)
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
