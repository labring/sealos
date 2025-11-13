package server

import (
	"context"
	"sync"
	"testing"
	"time"

	rtype "github.com/docker/docker/api/types/registry"

	"github.com/labring/image-cri-shim/pkg/types"

	"google.golang.org/grpc"
	api "k8s.io/cri-api/pkg/apis/runtime/v1"
)

func TestRewriteImageDomainMatching(t *testing.T) {
	withManifestStub(t, func(_ *manifestStub) {
		tests := []struct {
			name           string
			image          string
			criConfigs     map[string]rtype.AuthConfig
			offlineConfigs map[string]rtype.AuthConfig
			expectedDomain string
			expectedFound  bool
		}{
			{
				name:  "exact domain match",
				image: "registry.example.com/app/nginx:1.0",
				criConfigs: map[string]rtype.AuthConfig{
					"registry.example.com": {ServerAddress: "https://registry.example.com"},
				},
				expectedDomain: "registry.example.com",
				expectedFound:  true,
			},
			{
				name:  "subdomain match falls back to parent config",
				image: "cache.registry.example.com/app/nginx:2.0",
				criConfigs: map[string]rtype.AuthConfig{
					"registry.example.com": {ServerAddress: "https://registry.example.com"},
				},
				expectedDomain: "registry.example.com",
				expectedFound:  true,
			},
			{
				name:  "default registry falls back to offline",
				image: "nginx:latest",
				offlineConfigs: map[string]rtype.AuthConfig{
					"offline.registry.local": {ServerAddress: "https://offline.registry.local"},
				},
				expectedDomain: "offline.registry.local",
				expectedFound:  true,
			},
			{
				name:           "no registries available",
				image:          "busybox:latest",
				criConfigs:     map[string]rtype.AuthConfig{},
				offlineConfigs: map[string]rtype.AuthConfig{},
				expectedDomain: "",
				expectedFound:  false,
			},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				service := newImageServiceForTest(&types.ShimAuthConfig{
					CRIConfigs:        tt.criConfigs,
					OfflineCRIConfigs: tt.offlineConfigs,
				})
				result, found, _ := service.rewriteImage(tt.image, "pull")
				if found != tt.expectedFound {
					t.Fatalf("expected found=%v got=%v", tt.expectedFound, found)
				}
				if tt.expectedDomain == "" {
					if result != tt.image {
						t.Fatalf("expected image unchanged, got %s", result)
					}
					return
				}
				if domain := extractDomainFromImage(result); domain != tt.expectedDomain {
					t.Fatalf("expected domain %q, got %q", tt.expectedDomain, domain)
				}
			})
		}
	})
}

func TestRewriteImageCaching(t *testing.T) {
	withManifestStub(t, func(stub *manifestStub) {
		service := newImageServiceForTest(&types.ShimAuthConfig{
			CRIConfigs: map[string]rtype.AuthConfig{
				"registry.example.com": {ServerAddress: "https://registry.example.com"},
			},
		})

		image := "registry.example.com/app/nginx:1.0"
		if _, found, _ := service.rewriteImage(image, "pull"); !found {
			t.Fatalf("expected first rewrite to succeed")
		}
		if count := stub.callCount(image); count != 1 {
			t.Fatalf("expected 1 manifest call, got %d", count)
		}

		if _, found, _ := service.rewriteImage(image, "pull"); !found {
			t.Fatalf("expected cached rewrite to succeed")
		}
		if count := stub.callCount(image); count != 1 {
			t.Fatalf("expected cache hit to avoid manifest call, got %d", count)
		}
	})
}

func TestRewriteImageCacheExpiry(t *testing.T) {
	withManifestStub(t, func(stub *manifestStub) {
		service := newImageServiceForTest(&types.ShimAuthConfig{
			CRIConfigs: map[string]rtype.AuthConfig{
				"registry.example.com": {ServerAddress: "https://registry.example.com"},
			},
		})
		service.cacheTTL = 30 * time.Millisecond

		image := "registry.example.com/app/nginx:latest"
		if _, found, _ := service.rewriteImage(image, "pull"); !found {
			t.Fatalf("expected rewrite to succeed")
		}
		time.Sleep(50 * time.Millisecond)
		if _, found, _ := service.rewriteImage(image, "pull"); !found {
			t.Fatalf("expected rewrite after expiry to succeed")
		}

		if count := stub.callCount(image); count != 2 {
			t.Fatalf("expected cache expiry to trigger new manifest call, got %d", count)
		}
	})
}

func TestRewriteImageConcurrentAccess(t *testing.T) {
	withManifestStub(t, func(_ *manifestStub) {
		service := newImageServiceForTest(&types.ShimAuthConfig{
			CRIConfigs: map[string]rtype.AuthConfig{
				"registry.example.com": {ServerAddress: "https://registry.example.com"},
			},
		})
		service.cacheTTL = time.Second

		const goroutines = 20
		const iterations = 20
		image := "registry.example.com/app/nginx:1.1"

		var wg sync.WaitGroup
		results := make(chan string, goroutines*iterations)
		for i := 0; i < goroutines; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				for j := 0; j < iterations; j++ {
					out, found, _ := service.rewriteImage(image, "pull")
					if !found {
						t.Fatalf("expected rewrite to succeed in concurrent workload")
					}
					results <- out
				}
			}()
		}
		wg.Wait()
		close(results)

		var expected string
		for result := range results {
			if expected == "" {
				expected = result
				continue
			}
			if result != expected {
				t.Fatalf("expected %s, got %s", expected, result)
			}
		}
	})
}

func TestImageCacheEvictionOrder(t *testing.T) {
	withManifestStub(t, func(stub *manifestStub) {
		service := newImageServiceForTest(&types.ShimAuthConfig{
			CRIConfigs: map[string]rtype.AuthConfig{
				"registry.example.com": {ServerAddress: "https://registry.example.com"},
			},
		})
		service.setMaxCacheSize(2)

		images := []string{
			"registry.example.com/app/a:1",
			"registry.example.com/app/b:1",
			"registry.example.com/app/c:1",
		}

		for i := 0; i < 2; i++ {
			if _, found, _ := service.rewriteImage(images[i], "pull"); !found {
				t.Fatalf("expected rewrite for %s to succeed", images[i])
			}
			if got := stub.callCount(images[i]); got != 1 {
				t.Fatalf("expected manifest call for %s to be recorded once, got %d", images[i], got)
			}
		}

		// Touch the first image so the second one becomes the LRU entry.
		if _, found, _ := service.rewriteImage(images[0], "pull"); !found {
			t.Fatalf("expected cache hit for %s", images[0])
		}
		if got := stub.callCount(images[0]); got != 1 {
			t.Fatalf("expected cache hit to avoid manifest call for %s, got %d", images[0], got)
		}

		if _, found, _ := service.rewriteImage(images[2], "pull"); !found {
			t.Fatalf("expected rewrite for %s to succeed", images[2])
		}

		if _, found, _ := service.rewriteImage(images[1], "pull"); !found {
			t.Fatalf("expected rewrite for %s to succeed", images[1])
		}
		if got := stub.callCount(images[1]); got != 2 {
			t.Fatalf("expected LRU eviction to trigger second manifest call for %s, got %d", images[1], got)
		}
	})
}

func TestDomainCacheExpiry(t *testing.T) {
	service := newV1ImageService(nil, nil, CacheOptions{})
	service.setMaxCacheSize(4)
	service.domainTTL = 20 * time.Millisecond

	registries := map[string]rtype.AuthConfig{
		"registry.example.com": {ServerAddress: "https://registry.example.com"},
	}

	service.cacheDomainMatch("mirror.registry.example.com", "registry.example.com")
	if domain, cfg := service.getCachedDomainMatch("mirror.registry.example.com", registries); cfg == nil || domain != "registry.example.com" {
		t.Fatalf("expected domain cache hit, got domain=%s cfg=%v", domain, cfg)
	}

	time.Sleep(40 * time.Millisecond)

	if domain, cfg := service.getCachedDomainMatch("mirror.registry.example.com", registries); cfg != nil || domain != "" {
		t.Fatalf("expected domain cache entry to expire, got domain=%s cfg=%v", domain, cfg)
	}
}

func TestCacheStatsAccounting(t *testing.T) {
	withManifestStub(t, func(_ *manifestStub) {
		service := newImageServiceForTest(&types.ShimAuthConfig{
			CRIConfigs: map[string]rtype.AuthConfig{
				"registry.example.com": {ServerAddress: "https://registry.example.com"},
			},
		})
		service.cacheTTL = 10 * time.Millisecond

		image := "registry.example.com/app/nginx:latest"
		// first rewrite should miss cache and populate entries
		if _, found, _ := service.rewriteImage(image, "pull"); !found {
			t.Fatalf("expected rewrite to succeed")
		}
		stats := service.CacheStats()
		if stats.ImageMisses == 0 {
			t.Fatalf("expected image miss to be recorded, got %+v", stats)
		}
		if stats.DomainMisses == 0 {
			t.Fatalf("expected domain miss to be recorded, got %+v", stats)
		}

		// second rewrite should hit image cache
		if _, found, _ := service.rewriteImage(image, "pull"); !found {
			t.Fatalf("expected rewrite to succeed")
		}
		stats = service.CacheStats()
		if stats.ImageHits == 0 {
			t.Fatalf("expected cache hits to be recorded, got %+v", stats)
		}

		// simulate domain cache hit by looking up cached mapping directly
		service.cacheDomainMatch("mirror.registry.example.com", "registry.example.com")
		if _, cfg := service.getCachedDomainMatch("mirror.registry.example.com", map[string]rtype.AuthConfig{
			"registry.example.com": {ServerAddress: "https://registry.example.com"},
		}); cfg == nil {
			t.Fatalf("expected domain cache hit")
		}
		stats = service.CacheStats()
		if stats.DomainHits == 0 {
			t.Fatalf("expected domain hit counter to increment, got %+v", stats)
		}

		// force expiry to trigger eviction counters
		time.Sleep(20 * time.Millisecond)
		if _, found, _ := service.rewriteImage(image, "pull"); !found {
			t.Fatalf("expected rewrite to succeed after expiry")
		}
		stats = service.CacheStats()
		if stats.ImageEvictions == 0 {
			t.Fatalf("expected eviction counter to increment, got %+v", stats)
		}

		// invalidation should bump invalidation counter
		service.invalidateCache()
		stats = service.CacheStats()
		if stats.Invalidations == 0 {
			t.Fatalf("expected invalidation counter to increment, got %+v", stats)
		}
	})
}

func TestRewriteImageEdgeCases(t *testing.T) {
	withManifestStub(t, func(_ *manifestStub) {
		service := newImageServiceForTest(nil)

		if image, found, _ := service.rewriteImage("", "pull"); found || image != "" {
			t.Fatalf("expected empty image to remain unchanged, got %q found=%v", image, found)
		}

		if image, found, _ := service.rewriteImage("bad@@@", "pull"); found {
			t.Fatalf("expected invalid image to fail rewrite, got %q", image)
		}
	})
}

func TestPullImageInjectsAuthFromCRIConfig(t *testing.T) {
	withManifestStub(t, func(_ *manifestStub) {
		store := NewAuthStore(&types.ShimAuthConfig{
			CRIConfigs: map[string]rtype.AuthConfig{
				"registry.example.com": {
					Username:      "bot",
					Password:      "token",
					ServerAddress: "https://registry.example.com",
				},
			},
		})
		client := &fakeImageClient{}
		service := newV1ImageService(client, store, CacheOptions{})
		req := &api.PullImageRequest{
			Image: &api.ImageSpec{Image: "registry.example.com/app/nginx:latest"},
		}
		if _, err := service.PullImage(context.Background(), req); err != nil {
			t.Fatalf("PullImage failed: %v", err)
		}
		if client.lastPull == nil {
			t.Fatalf("expected client to observe pull request")
		}
		if client.lastPull.Auth == nil || client.lastPull.Auth.Username != "bot" {
			t.Fatalf("expected auth to be injected, got %+v", client.lastPull.Auth)
		}
	})
}

type fakeImageClient struct {
	lastPull *api.PullImageRequest
}

func (f *fakeImageClient) ListImages(ctx context.Context, in *api.ListImagesRequest, opts ...grpc.CallOption) (*api.ListImagesResponse, error) {
	return &api.ListImagesResponse{}, nil
}

func (f *fakeImageClient) ImageStatus(ctx context.Context, in *api.ImageStatusRequest, opts ...grpc.CallOption) (*api.ImageStatusResponse, error) {
	return &api.ImageStatusResponse{}, nil
}

func (f *fakeImageClient) PullImage(ctx context.Context, in *api.PullImageRequest, opts ...grpc.CallOption) (*api.PullImageResponse, error) {
	f.lastPull = in
	ref := ""
	if in.GetImage() != nil {
		ref = in.GetImage().GetImage()
	}
	return &api.PullImageResponse{ImageRef: ref}, nil
}

func (f *fakeImageClient) RemoveImage(ctx context.Context, in *api.RemoveImageRequest, opts ...grpc.CallOption) (*api.RemoveImageResponse, error) {
	return &api.RemoveImageResponse{}, nil
}

func (f *fakeImageClient) ImageFsInfo(ctx context.Context, in *api.ImageFsInfoRequest, opts ...grpc.CallOption) (*api.ImageFsInfoResponse, error) {
	return &api.ImageFsInfoResponse{}, nil
}
