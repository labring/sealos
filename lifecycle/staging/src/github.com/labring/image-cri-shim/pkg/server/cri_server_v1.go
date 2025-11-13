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

	api "k8s.io/cri-api/pkg/apis/runtime/v1"

	"github.com/labring/sealos/pkg/utils/logger"
)

type v1ImageService struct {
	imageClient  api.ImageServiceClient
	authStore    *AuthStore
	cacheMutex   sync.RWMutex
	imageCache   map[string]cacheEntry
	domainCache  map[string]string
	maxCacheSize int
	cacheTTL     time.Duration
}

type cacheEntry struct {
	newImage string
	auth     *rtype.AuthConfig
	found    bool
	expiry   time.Time
}

const (
	defaultImageCacheSize = 1024
	defaultCacheTTL       = 30 * time.Minute
	domainCacheRatio      = 10
)

func newV1ImageService(client api.ImageServiceClient, authStore *AuthStore) *v1ImageService {
	service := &v1ImageService{
		imageClient:  client,
		authStore:    authStore,
		imageCache:   make(map[string]cacheEntry),
		domainCache:  make(map[string]string),
		maxCacheSize: defaultImageCacheSize,
		cacheTTL:     defaultCacheTTL,
	}
	if service.cacheTTL <= 0 {
		service.cacheTTL = defaultCacheTTL
	}
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
	if s.maxCacheSize <= 0 {
		return cacheEntry{}, false
	}
	s.cacheMutex.RLock()
	entry, ok := s.imageCache[image]
	s.cacheMutex.RUnlock()
	if !ok {
		return cacheEntry{}, false
	}
	if time.Now().After(entry.expiry) {
		s.cacheMutex.Lock()
		delete(s.imageCache, image)
		s.cacheMutex.Unlock()
		return cacheEntry{}, false
	}
	entry.auth = cloneAuthConfig(entry.auth)
	return entry, true
}

func (s *v1ImageService) cacheResult(image, newImage string, found bool, auth *rtype.AuthConfig) {
	if s.maxCacheSize <= 0 {
		return
	}
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()

	if s.imageCache == nil {
		s.imageCache = make(map[string]cacheEntry, s.maxCacheSize)
	}
	if len(s.imageCache) >= s.maxCacheSize {
		s.evictOldestCacheEntryLocked()
	}

	ttl := s.cacheTTL
	if ttl <= 0 {
		ttl = defaultCacheTTL
	}

	s.imageCache[image] = cacheEntry{
		newImage: newImage,
		auth:     cloneAuthConfig(auth),
		found:    found,
		expiry:   time.Now().Add(ttl),
	}
}

func (s *v1ImageService) cacheDomainMatch(imageDomain, registryDomain string) {
	if imageDomain == "" || registryDomain == "" {
		return
	}
	limit := s.maxDomainCacheSize()
	if limit == 0 {
		return
	}
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()
	if s.domainCache == nil {
		s.domainCache = make(map[string]string, limit)
	}
	if len(s.domainCache) >= limit {
		s.trimDomainCache(len(s.domainCache) - limit + 1)
	}
	s.domainCache[imageDomain] = registryDomain
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

func (s *v1ImageService) trimDomainCache(remove int) {
	if remove <= 0 {
		return
	}
	for key := range s.domainCache {
		delete(s.domainCache, key)
		remove--
		if remove <= 0 {
			break
		}
	}
}

func (s *v1ImageService) evictOldestCacheEntryLocked() {
	if len(s.imageCache) == 0 {
		return
	}
	var oldestKey string
	var oldestExpiry time.Time
	for key, entry := range s.imageCache {
		if oldestKey == "" || entry.expiry.Before(oldestExpiry) {
			oldestKey = key
			oldestExpiry = entry.expiry
		}
	}
	delete(s.imageCache, oldestKey)
}

func (s *v1ImageService) invalidateCache() {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()
	s.imageCache = make(map[string]cacheEntry)
	s.domainCache = make(map[string]string)
}

func (s *v1ImageService) findMatchingRegistry(domain string, registries map[string]rtype.AuthConfig) (string, *rtype.AuthConfig) {
	if domain == "" || len(registries) == 0 {
		return "", nil
	}

	s.cacheMutex.RLock()
	if cachedDomain, ok := s.domainCache[domain]; ok {
		if cfg, exists := registries[cachedDomain]; exists {
			s.cacheMutex.RUnlock()
			cfgCopy := cfg
			return cachedDomain, &cfgCopy
		}
		s.cacheMutex.RUnlock()
		s.cacheMutex.Lock()
		delete(s.domainCache, domain)
		s.cacheMutex.Unlock()
	} else {
		s.cacheMutex.RUnlock()
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
