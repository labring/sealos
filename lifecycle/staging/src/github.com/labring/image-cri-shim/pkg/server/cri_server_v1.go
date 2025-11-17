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

package server

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	rtype "github.com/docker/docker/api/types/registry"
	lru "github.com/hashicorp/golang-lru"

	api "k8s.io/cri-api/pkg/apis/runtime/v1"

	"github.com/labring/sealos/pkg/utils/logger"
)

type v1ImageService struct {
	imageClient  api.ImageServiceClient
	authStore    *AuthStore
	cacheMutex   sync.RWMutex
	imageCache   *lru.Cache
	domainCache  *lru.Cache
	maxCacheSize int
	cacheTTL     time.Duration
	domainTTL    time.Duration
	metrics      *cacheMetrics
}

type cacheEntry struct {
	newImage string
	auth     *rtype.AuthConfig
	found    bool
	expiry   time.Time
}

type domainEntry struct {
	registryDomain string
	expiry         time.Time
}

type CacheOptions struct {
	ImageCacheSize int
	ImageCacheTTL  time.Duration
	DomainCacheTTL time.Duration
}

type CacheStats struct {
	ImageHits       uint64
	ImageMisses     uint64
	DomainHits      uint64
	DomainMisses    uint64
	ImageEvictions  uint64
	DomainEvictions uint64
	Invalidations   uint64
	GeneratedAt     time.Time
}

type cacheMetrics struct {
	imageHits       atomic.Uint64
	imageMisses     atomic.Uint64
	domainHits      atomic.Uint64
	domainMisses    atomic.Uint64
	imageEvictions  atomic.Uint64
	domainEvictions atomic.Uint64
	invalidations   atomic.Uint64
}

const (
	// defaultImageCacheSize sets the default maximum number of cached image rewrite results.
	// 1024 entries is a balance between hit rate and memory use for typical clusters; at roughly
	// ~200 bytes per entry this uses around 200KB. Operators can tune this via config if they
	// need a larger or smaller cache.
	defaultImageCacheSize = 1024
	// defaultCacheTTL is how long cached rewrite results stay valid before being refreshed.
	// The 30m default keeps cache freshness reasonable without frequent churn; adjust if workloads
	// demand shorter or longer staleness windows.
	defaultCacheTTL = 30 * time.Minute
	// defaultDomainCacheTTL is the expiry window for registry-domain match entries.
	defaultDomainCacheTTL = 10 * time.Minute
	// domainCacheRatio determines the size of the domain cache as imageCacheSize/ratio. A ratio of
	// 10 keeps domain cache small relative to image cache to cap memory use while still providing
	// effective domain-level memoization; tweak if a different ratio is desired.
	domainCacheRatio = 10
)

func (c CacheOptions) normalize() CacheOptions {
	if c.ImageCacheSize == 0 {
		c.ImageCacheSize = defaultImageCacheSize
	}
	if c.ImageCacheSize < 0 {
		c.ImageCacheSize = 0
	}
	if c.ImageCacheTTL <= 0 {
		c.ImageCacheTTL = defaultCacheTTL
	}
	if c.DomainCacheTTL <= 0 {
		c.DomainCacheTTL = defaultDomainCacheTTL
	}
	return c
}

func newCacheMetrics() *cacheMetrics {
	return &cacheMetrics{}
}

func (m *cacheMetrics) snapshot() CacheStats {
	if m == nil {
		return CacheStats{}
	}
	return CacheStats{
		ImageHits:       m.imageHits.Load(),
		ImageMisses:     m.imageMisses.Load(),
		DomainHits:      m.domainHits.Load(),
		DomainMisses:    m.domainMisses.Load(),
		ImageEvictions:  m.imageEvictions.Load(),
		DomainEvictions: m.domainEvictions.Load(),
		Invalidations:   m.invalidations.Load(),
		GeneratedAt:     time.Now(),
	}
}

func (m *cacheMetrics) recordImageHit() {
	if m != nil {
		m.imageHits.Add(1)
	}
}

func (m *cacheMetrics) recordImageMiss() {
	if m != nil {
		m.imageMisses.Add(1)
	}
}

func (m *cacheMetrics) recordDomainHit() {
	if m != nil {
		m.domainHits.Add(1)
	}
}

func (m *cacheMetrics) recordDomainMiss() {
	if m != nil {
		m.domainMisses.Add(1)
	}
}

func (m *cacheMetrics) recordImageEviction() {
	if m != nil {
		m.imageEvictions.Add(1)
	}
}

func (m *cacheMetrics) recordDomainEviction() {
	if m != nil {
		m.domainEvictions.Add(1)
	}
}

func (m *cacheMetrics) recordInvalidation() {
	if m != nil {
		m.invalidations.Add(1)
	}
}

func newV1ImageService(client api.ImageServiceClient, authStore *AuthStore, cacheOpts CacheOptions) *v1ImageService {
	service := &v1ImageService{
		imageClient: client,
		authStore:   authStore,
		metrics:     newCacheMetrics(),
	}
	service.UpdateCacheOptions(cacheOpts)
	if authStore != nil {
		authStore.AddObserver(service.invalidateCache)
	}
	return service
}

func (s *v1ImageService) UpdateCacheOptions(opts CacheOptions) {
	normalized := opts.normalize()
	s.cacheMutex.Lock()
	s.cacheTTL = normalized.ImageCacheTTL
	s.domainTTL = normalized.DomainCacheTTL
	s.cacheMutex.Unlock()
	s.setMaxCacheSize(normalized.ImageCacheSize)
}

func (s *v1ImageService) rewriteImage(image, action string) (string, bool, *rtype.AuthConfig) {
	if entry, ok := s.getCachedResult(image); ok {
		s.logRewriteResult(action, image, entry.newImage, "cache", true, entry.found)
		return entry.newImage, entry.found, entry.auth
	}

	if s.authStore == nil {
		s.logRewriteResult(action, image, image, "authstore-disabled", false, false)
		return image, false, nil
	}

	domain := extractDomainFromImage(image)
	if domain != "" {
		if registries := s.authStore.GetCRIConfigs(); len(registries) > 0 {
			if matchedDomain, cfg := s.findMatchingRegistry(domain, registries); cfg != nil {
				newImage, ok, auth := replaceImage(image, action, map[string]rtype.AuthConfig{matchedDomain: *cfg})
				s.cacheResult(image, newImage, ok, auth)
				s.logRewriteResult(action, image, newImage, fmt.Sprintf("cri-domain:%s", matchedDomain), false, ok)
				return newImage, ok, auth
			}
		}
	}

	newImage, ok, auth := replaceImage(image, action, s.authStore.GetOfflineConfigs())
	if ok {
		s.cacheResult(image, newImage, ok, auth)
		s.logRewriteResult(action, image, newImage, "offline", false, true)
		return newImage, true, auth
	}

	registries := s.authStore.GetCRIConfigs()
	if len(registries) == 0 {
		s.cacheResult(image, image, false, nil)
		s.logRewriteResult(action, image, image, "no-registries", false, false)
		return image, false, nil
	}
	newImage, ok, auth = replaceImage(image, action, registries)
	s.cacheResult(image, newImage, ok, auth)
	s.logRewriteResult(action, image, newImage, "cri", false, ok)
	return newImage, ok, auth
}

func (s *v1ImageService) getCachedResult(image string) (cacheEntry, bool) {
	if image == "" {
		return cacheEntry{}, false
	}
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()
	if s.maxCacheSize <= 0 || s.imageCache == nil {
		return cacheEntry{}, false
	}

	if raw, ok := s.imageCache.Get(image); ok {
		entry, valid := raw.(cacheEntry)
		if !valid || time.Now().After(entry.expiry) {
			s.imageCache.Remove(image)
			s.metrics.recordImageEviction()
			s.metrics.recordImageMiss()
			return cacheEntry{}, false
		}
		s.metrics.recordImageHit()
		entry.auth = cloneAuthConfig(entry.auth)
		return entry, true
	}
	s.metrics.recordImageMiss()
	return cacheEntry{}, false
}

func (s *v1ImageService) cacheResult(image, newImage string, found bool, auth *rtype.AuthConfig) {
	if s.maxCacheSize <= 0 || image == "" {
		return
	}
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()
	if s.imageCache == nil {
		return
	}

	ttl := s.cacheTTL
	if ttl <= 0 {
		ttl = defaultCacheTTL
	}

	s.imageCache.Add(image, cacheEntry{
		newImage: newImage,
		auth:     cloneAuthConfig(auth),
		found:    found,
		expiry:   time.Now().Add(ttl),
	})
}

func (s *v1ImageService) cacheDomainMatch(imageDomain, registryDomain string) {
	if imageDomain == "" || registryDomain == "" {
		return
	}
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()
	if s.domainCache == nil {
		return
	}

	ttl := s.domainTTL
	if ttl <= 0 {
		ttl = defaultDomainCacheTTL
	}
	s.domainCache.Add(imageDomain, domainEntry{
		registryDomain: registryDomain,
		expiry:         time.Now().Add(ttl),
	})
}

func (s *v1ImageService) getCachedDomainMatch(domain string, registries map[string]rtype.AuthConfig) (string, *rtype.AuthConfig) {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()
	if s.domainCache == nil {
		return "", nil
	}
	raw, ok := s.domainCache.Get(domain)
	if !ok {
		s.metrics.recordDomainMiss()
		return "", nil
	}
	entry, valid := raw.(domainEntry)
	if !valid || time.Now().After(entry.expiry) {
		s.domainCache.Remove(domain)
		s.metrics.recordDomainEviction()
		s.metrics.recordDomainMiss()
		return "", nil
	}
	cfg, exists := registries[entry.registryDomain]
	if !exists {
		s.domainCache.Remove(domain)
		s.metrics.recordDomainEviction()
		s.metrics.recordDomainMiss()
		return "", nil
	}
	s.metrics.recordDomainHit()
	cfgCopy := cfg
	return entry.registryDomain, &cfgCopy
}

func (s *v1ImageService) maxDomainCacheSize() int {
	if s.maxCacheSize <= 0 {
		return 0
	}
	size := s.maxCacheSize / domainCacheRatio
	if size == 0 {
		size = 1
	}
	return size
}

func (s *v1ImageService) invalidateCache() {
	var purged bool
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()
	if s.imageCache != nil {
		s.imageCache.Purge()
		purged = true
	}
	if s.domainCache != nil {
		s.domainCache.Purge()
		purged = true
	}
	if purged {
		s.metrics.recordInvalidation()
	}
}

func (s *v1ImageService) findMatchingRegistry(domain string, registries map[string]rtype.AuthConfig) (string, *rtype.AuthConfig) {
	if domain == "" || len(registries) == 0 {
		return "", nil
	}

	if cachedDomain, cfg := s.getCachedDomainMatch(domain, registries); cfg != nil {
		return cachedDomain, cfg
	}

	for regDomain, cfg := range registries {
		if strings.EqualFold(domain, regDomain) {
			s.cacheDomainMatch(domain, regDomain)
			cfgCopy := cfg
			return regDomain, &cfgCopy
		}
	}

	return "", nil
}

func (s *v1ImageService) logRewriteResult(action, original, rewritten, source string, cacheHit bool, replaced bool) {
	logger.Info("rewrite action=%s cache_hit=%t source=%s original=%s result=%s replaced=%t",
		action, cacheHit, source, original, rewritten, replaced)
}

func (s *v1ImageService) CacheStats() CacheStats {
	return s.metrics.snapshot()
}

func (s *v1ImageService) setMaxCacheSize(size int) {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()
	if s.maxCacheSize == size {
		if size == 0 || s.imageCache != nil {
			return
		}
	}
	s.maxCacheSize = size
	s.rebuildCachesLocked()
}

func (s *v1ImageService) rebuildCachesLocked() {
	hadCache := s.imageCache != nil || s.domainCache != nil
	if s.maxCacheSize <= 0 {
		s.imageCache = nil
		s.domainCache = nil
		if hadCache {
			s.metrics.recordInvalidation()
		}
		return
	}

	imageCache, err := lru.New(s.maxCacheSize)
	if err != nil {
		logger.Warn("failed to create image cache: %v", err)
		s.imageCache = nil
	} else {
		s.imageCache = imageCache
	}

	domainSize := s.maxDomainCacheSize()
	if domainSize <= 0 {
		s.domainCache = nil
		return
	}
	domainCache, err := lru.New(domainSize)
	if err != nil {
		logger.Warn("failed to create domain cache: %v", err)
		s.domainCache = nil
		return
	}
	s.domainCache = domainCache
	if hadCache {
		s.metrics.recordInvalidation()
	}
}

func cloneAuthConfig(cfg *rtype.AuthConfig) *rtype.AuthConfig {
	if cfg == nil {
		return nil
	}
	copyCfg := *cfg
	return &copyCfg
}

func ToV1AuthConfig(c *rtype.AuthConfig) *api.AuthConfig {
	return &api.AuthConfig{
		Username:      c.Username,
		Password:      c.Password,
		Auth:          c.Auth,
		ServerAddress: c.ServerAddress,
		IdentityToken: c.IdentityToken,
		RegistryToken: c.RegistryToken,
	}
}

func (s *v1ImageService) ListImages(ctx context.Context,
	req *api.ListImagesRequest) (*api.ListImagesResponse, error) {
	logger.Debug("ListImages: %+v", req)
	rsp, err := s.imageClient.ListImages(ctx, req)

	if err != nil {
		return nil, err
	}

	return rsp, err
}

func (s *v1ImageService) ImageStatus(ctx context.Context,
	req *api.ImageStatusRequest) (*api.ImageStatusResponse, error) {
	logger.Debug("ImageStatus: %+v", req)
	if req.Image != nil {
		if id, _ := s.GetImageRefByID(ctx, req.Image.Image); id != "" {
			req.Image.Image = id
		} else {
			if newImage, ok, _ := s.rewriteImage(req.Image.Image, "ImageStatus"); ok {
				req.Image.Image = newImage
			}
		}
	}
	rsp, err := s.imageClient.ImageStatus(ctx, req)

	if err != nil {
		return nil, err
	}

	return rsp, err
}

func (s *v1ImageService) PullImage(ctx context.Context,
	req *api.PullImageRequest) (*api.PullImageResponse, error) {
	logger.Debug("PullImage begin: %+v", req)
	if req.Image != nil {
		imageName := req.Image.Image
		if newImage, ok, auth := s.rewriteImage(req.Image.Image, "PullImage"); ok {
			imageName = newImage
			if auth != nil {
				req.Auth = ToV1AuthConfig(auth)
			}
		}
		if req.Auth == nil && s.authStore != nil {
			if registries := s.authStore.GetCRIConfigs(); len(registries) > 0 {
				domain := extractDomainFromImage(imageName)
				if matchedDomain, cfg := s.findMatchingRegistry(domain, registries); cfg != nil {
					s.cacheDomainMatch(domain, matchedDomain)
					req.Auth = ToV1AuthConfig(cfg)
				}
			}
		}
		req.Image.Image = imageName
	}
	logger.Debug("PullImage after: %+v", req)
	rsp, err := s.imageClient.PullImage(ctx, req)
	if err != nil {
		return nil, err
	}

	return rsp, err
}

func (s *v1ImageService) RemoveImage(ctx context.Context,
	req *api.RemoveImageRequest) (*api.RemoveImageResponse, error) {
	logger.Debug("RemoveImage: %+v", req)
	if req.Image != nil {
		if id, _ := s.GetImageRefByID(ctx, req.Image.Image); id != "" {
			req.Image.Image = id
		} else {
			if newImage, ok, _ := s.rewriteImage(req.Image.Image, "RemoveImage"); ok {
				req.Image.Image = newImage
			}
		}
	}
	rsp, err := s.imageClient.RemoveImage(ctx, req)

	if err != nil {
		return nil, err
	}

	return rsp, err
}

func (s *v1ImageService) ImageFsInfo(ctx context.Context,
	req *api.ImageFsInfoRequest) (*api.ImageFsInfoResponse, error) {
	logger.Debug("ImageFsInfo: %+v", req)
	rsp, err := s.imageClient.ImageFsInfo(ctx, req)

	if err != nil {
		return nil, err
	}

	return rsp, err
}

func (s *v1ImageService) GetImageRefByID(ctx context.Context, image string) (string, error) {
	resp, err := s.imageClient.ImageStatus(ctx, &api.ImageStatusRequest{
		Image: &api.ImageSpec{
			Image: image,
		},
	})
	if err != nil {
		logger.Warn("Failed to get image %s status: %v", image, err)
		return "", err
	}
	if resp.Image == nil {
		return "", nil
	}
	return resp.Image.Id, nil
}
