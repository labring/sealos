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
	"sort"
	"sync"

	rtype "github.com/docker/docker/api/types/registry"

	"github.com/labring/image-cri-shim/pkg/types"

	"github.com/labring/sealos/pkg/utils/logger"
)

type AuthStore struct {
	mu                sync.RWMutex
	criConfigs        map[string]rtype.AuthConfig
	criPriorities     map[string]int // Registry priority mapping
	offlineCRIConfigs map[string]rtype.AuthConfig
	offlinePriority   int // Priority for offline registry (sealos.hub)
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
		a.criPriorities = map[string]int{}
		a.offlineCRIConfigs = map[string]rtype.AuthConfig{}
		a.offlinePriority = types.SealosHubDefaultPriority
		logger.Warn("received empty shim auth config, cleared cached registry credentials")
    } else {
        a.criConfigs = cloneAuthMap(auth.CRIConfigs)
        a.criPriorities = clonePriorityMap(auth.CRIPriorities)
        a.offlineCRIConfigs = cloneAuthMap(auth.OfflineCRIConfigs)
        a.offlinePriority = auth.OfflinePriority
        logger.Debug("updated shim auth config, registries: %d, offline: %d, priorities: %+v",
            len(a.criConfigs), len(a.offlineCRIConfigs), a.criPriorities)
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

func (a *AuthStore) GetOfflinePriority() int {
	a.mu.RLock()
	defer a.mu.RUnlock()

	return a.offlinePriority
}

func (a *AuthStore) GetCRIPriorities() map[string]int {
	a.mu.RLock()
	defer a.mu.RUnlock()

	return clonePriorityMap(a.criPriorities)
}

// GetSortedRegistries returns all registries (including offline) sorted by priority (highest first)
func (a *AuthStore) GetSortedRegistries() []RegistryEntry {
	a.mu.RLock()
	defer a.mu.RUnlock()

	// Collect all registries with their priorities
	entries := make([]RegistryEntry, 0, len(a.criConfigs)+1)

	// Add offline registry (sealos.hub)
	for domain, cfg := range a.offlineCRIConfigs {
		entries = append(entries, RegistryEntry{
			Domain:   domain,
			Config:   cfg,
			Priority: a.offlinePriority,
			IsOffline: true,
		})
	}

	// Add configured registries
	for domain, cfg := range a.criConfigs {
		priority := a.criPriorities[domain]
		if priority == 0 {
			priority = types.RegistryDefaultPriority
		}
		entries = append(entries, RegistryEntry{
			Domain:    domain,
			Config:    cfg,
			Priority:  priority,
			IsOffline: false,
		})
	}

	// Sort by priority (highest first)
	sortRegistriesByPriority(entries)

	return entries
}

// RegistryEntry represents a registry with its configuration and priority
type RegistryEntry struct {
	Domain    string
	Config    rtype.AuthConfig
	Priority  int
	IsOffline bool
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

func clonePriorityMap(src map[string]int) map[string]int {
	if len(src) == 0 {
		return map[string]int{}
	}
	dst := make(map[string]int, len(src))
	for k, v := range src {
		dst[k] = v
	}
	return dst
}

func sortRegistriesByPriority(entries []RegistryEntry) {
	// Sort by priority (highest first), then by domain name for stability
	sort.Slice(entries, func(i, j int) bool {
		if entries[i].Priority != entries[j].Priority {
			return entries[i].Priority > entries[j].Priority
		}
		// If priorities are equal, prefer offline registry first
		if entries[i].IsOffline != entries[j].IsOffline {
			return entries[i].IsOffline
		}
		// Otherwise sort by domain name for consistent ordering
		return entries[i].Domain < entries[j].Domain
	})
}
