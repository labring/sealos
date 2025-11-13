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
	"sync"

	rtype "github.com/docker/docker/api/types/registry"

	"github.com/labring/image-cri-shim/pkg/types"

	"github.com/labring/sealos/pkg/utils/logger"
)

type AuthStore struct {
	mu                sync.RWMutex
	criConfigs        map[string]rtype.AuthConfig
	offlineCRIConfigs map[string]rtype.AuthConfig
	observers         []func()
}

func NewAuthStore(auth *types.ShimAuthConfig) *AuthStore {
	store := &AuthStore{}
	store.Update(auth)
	return store
}

func (a *AuthStore) Update(auth *types.ShimAuthConfig) {
	a.mu.Lock()

	if auth == nil {
		a.criConfigs = map[string]rtype.AuthConfig{}
		a.offlineCRIConfigs = map[string]rtype.AuthConfig{}
		logger.Warn("received empty shim auth config, cleared cached registry credentials")
	} else {
		a.criConfigs = cloneAuthMap(auth.CRIConfigs)
		a.offlineCRIConfigs = cloneAuthMap(auth.OfflineCRIConfigs)
		logger.Info("updated shim auth config, registries: %d, offline: %d", len(a.criConfigs), len(a.offlineCRIConfigs))
	}

	observers := append([]func(){}, a.observers...)
	a.mu.Unlock()

	for _, observer := range observers {
		if observer != nil {
			observer()
		}
	}
}

func (a *AuthStore) GetCRIConfig(registry string) (rtype.AuthConfig, bool) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	cfg, ok := a.criConfigs[registry]
	return cfg, ok
}

func (a *AuthStore) GetCRIConfigs() map[string]rtype.AuthConfig {
	a.mu.RLock()
	defer a.mu.RUnlock()

	return cloneAuthMap(a.criConfigs)
}

func (a *AuthStore) GetOfflineConfigs() map[string]rtype.AuthConfig {
	a.mu.RLock()
	defer a.mu.RUnlock()

	return cloneAuthMap(a.offlineCRIConfigs)
}

func (a *AuthStore) AddObserver(observer func()) {
	if observer == nil {
		return
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	a.observers = append(a.observers, observer)
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
