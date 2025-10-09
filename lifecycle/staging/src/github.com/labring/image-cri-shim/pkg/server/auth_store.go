package server

import (
	"sync"

	rtype "github.com/docker/docker/api/types/registry"

	"github.com/labring/image-cri-shim/pkg/types"

	"github.com/labring/sealos/pkg/utils/logger"
)

type AuthStore struct {
	mu                sync.RWMutex
	criConfigs        map[string]rtype.AuthConfig
	offlineCRIConfigs map[string]rtype.AuthConfig
	criSkipLogin      map[string]bool
}

func NewAuthStore(auth *types.ShimAuthConfig) *AuthStore {
	store := &AuthStore{}
	store.Update(auth)
	return store
}

func (a *AuthStore) Update(auth *types.ShimAuthConfig) {
	a.mu.Lock()
	defer a.mu.Unlock()

	if auth == nil {
		a.criConfigs = map[string]rtype.AuthConfig{}
		a.offlineCRIConfigs = map[string]rtype.AuthConfig{}
		a.criSkipLogin = map[string]bool{}
		logger.Warn("received empty shim auth config, cleared cached registry credentials")
		return
	}

	a.criConfigs = cloneAuthMap(auth.CRIConfigs)
	a.offlineCRIConfigs = cloneAuthMap(auth.OfflineCRIConfigs)
	a.criSkipLogin = cloneSkipMap(auth.SkipLoginRegistries)
	logger.Info("updated shim auth config, registries: %d, offline: %d", len(a.criConfigs), len(a.offlineCRIConfigs))
}

func (a *AuthStore) GetCRIConfig(registry string) (rtype.AuthConfig, bool) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	cfg, ok := a.criConfigs[registry]
	return cfg, ok
}

func (a *AuthStore) ShouldSkipLogin(registry string) bool {
	a.mu.RLock()
	defer a.mu.RUnlock()

	return a.criSkipLogin[registry]
}

func (a *AuthStore) GetCRIConfigs() (map[string]rtype.AuthConfig, map[string]bool) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	return cloneAuthMap(a.criConfigs), cloneSkipMap(a.criSkipLogin)
}

func (a *AuthStore) GetOfflineConfigs() map[string]rtype.AuthConfig {
	a.mu.RLock()
	defer a.mu.RUnlock()

	return cloneAuthMap(a.offlineCRIConfigs)
}

func cloneAuthMap(src map[string]rtype.AuthConfig) map[string]rtype.AuthConfig {
	if len(src) == 0 {
		return map[string]rtype.AuthConfig{}
	}
	dst := make(map[string]rtype.AuthConfig, len(src))
	for k, v := range src {
		dst[k] = v
	}
	return dst
}

func cloneSkipMap(src map[string]bool) map[string]bool {
	if len(src) == 0 {
		return map[string]bool{}
	}
	dst := make(map[string]bool, len(src))
	for k, v := range src {
		dst[k] = v
	}
	return dst
}
