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
	"strings"
	"sync"
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

const (
	defaultImageCacheSize = 1024
	defaultCacheTTL       = 30 * time.Minute
	defaultDomainCacheTTL = 10 * time.Minute
	domainCacheRatio      = 10
)

func newV1ImageService(client api.ImageServiceClient, authStore *AuthStore) *v1ImageService {
	service := &v1ImageService{
		imageClient: client,
		authStore:   authStore,
		cacheTTL:    defaultCacheTTL,
		domainTTL:   defaultDomainCacheTTL,
	}
	service.setMaxCacheSize(defaultImageCacheSize)
	if authStore != nil {
		authStore.AddObserver(service.invalidateCache)
	}
	return service
}

func (s *v1ImageService) rewriteImage(image, action string) (string, bool, *rtype.AuthConfig) {
	if entry, ok := s.getCachedResult(image); ok {
		return entry.newImage, entry.found, entry.auth
	}

	if s.authStore == nil {
		return image, false, nil
	}

	domain := extractDomainFromImage(image)
	if domain != "" {
		if registries := s.authStore.GetCRIConfigs(); len(registries) > 0 {
			if matchedDomain, cfg := s.findMatchingRegistry(domain, registries); cfg != nil {
				newImage, ok, auth := replaceImage(image, action, map[string]rtype.AuthConfig{matchedDomain: *cfg})
				s.cacheResult(image, newImage, ok, auth)
				return newImage, ok, auth
			}
		}
	}

	newImage, ok, auth := replaceImage(image, action, s.authStore.GetOfflineConfigs())
	if ok {
		s.cacheResult(image, newImage, ok, auth)
		return newImage, true, auth
	}

	registries := s.authStore.GetCRIConfigs()
	if len(registries) == 0 {
		s.cacheResult(image, image, false, nil)
		return image, false, nil
	}
	newImage, ok, auth = replaceImage(image, action, registries)
	s.cacheResult(image, newImage, ok, auth)
	return newImage, ok, auth
}

func (s *v1ImageService) getCachedResult(image string) (cacheEntry, bool) {
	if s.maxCacheSize <= 0 || image == "" {
		return cacheEntry{}, false
	}
	cache := s.getImageCache()
	if cache == nil {
		return cacheEntry{}, false
	}

	if raw, ok := cache.Get(image); ok {
		entry, valid := raw.(cacheEntry)
		if !valid || time.Now().After(entry.expiry) {
			cache.Remove(image)
			return cacheEntry{}, false
		}
		entry.auth = cloneAuthConfig(entry.auth)
		return entry, true
	}
	return cacheEntry{}, false
}

func (s *v1ImageService) cacheResult(image, newImage string, found bool, auth *rtype.AuthConfig) {
	if s.maxCacheSize <= 0 || image == "" {
		return
	}
	cache := s.getImageCache()
	if cache == nil {
		return
	}

	ttl := s.cacheTTL
	if ttl <= 0 {
		ttl = defaultCacheTTL
	}

	cache.Add(image, cacheEntry{
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
	cache := s.getDomainCache()
	if cache == nil {
		return
	}

	ttl := s.domainTTL
	if ttl <= 0 {
		ttl = defaultDomainCacheTTL
	}
	cache.Add(imageDomain, domainEntry{
		registryDomain: registryDomain,
		expiry:         time.Now().Add(ttl),
	})
}

func (s *v1ImageService) getCachedDomainMatch(domain string, registries map[string]rtype.AuthConfig) (string, *rtype.AuthConfig) {
	cache := s.getDomainCache()
	if cache == nil {
		return "", nil
	}
	raw, ok := cache.Get(domain)
	if !ok {
		return "", nil
	}
	entry, valid := raw.(domainEntry)
	if !valid || time.Now().After(entry.expiry) {
		cache.Remove(domain)
		return "", nil
	}
	cfg, exists := registries[entry.registryDomain]
	if !exists {
		cache.Remove(domain)
		return "", nil
	}
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
	if cache := s.getImageCache(); cache != nil {
		cache.Purge()
	}
	if cache := s.getDomainCache(); cache != nil {
		cache.Purge()
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

	for regDomain, cfg := range registries {
		if strings.HasSuffix(domain, "."+regDomain) || strings.HasSuffix(regDomain, "."+domain) {
			s.cacheDomainMatch(domain, regDomain)
			cfgCopy := cfg
			return regDomain, &cfgCopy
		}
	}

	return "", nil
}

func (s *v1ImageService) getImageCache() *lru.Cache {
	s.cacheMutex.RLock()
	defer s.cacheMutex.RUnlock()
	return s.imageCache
}

func (s *v1ImageService) getDomainCache() *lru.Cache {
	s.cacheMutex.RLock()
	defer s.cacheMutex.RUnlock()
	return s.domainCache
}

func (s *v1ImageService) setMaxCacheSize(size int) {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()
	s.maxCacheSize = size
	s.rebuildCachesLocked()
}

func (s *v1ImageService) rebuildCachesLocked() {
	if s.maxCacheSize <= 0 {
		s.imageCache = nil
		s.domainCache = nil
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
			domain := extractDomainFromImage(imageName)
			if cfg, ok := s.authStore.GetCRIConfig(domain); ok {
				req.Auth = ToV1AuthConfig(&cfg)
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
