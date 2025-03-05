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

package maps

import "sync"

type ConcurrentMap struct {
	mu sync.RWMutex
	m  map[string]interface{}
}

func NewConcurrentMap() *ConcurrentMap {
	return &ConcurrentMap{
		m: make(map[string]interface{}),
	}
}

func (cm *ConcurrentMap) Set(key string, value interface{}) {
	cm.mu.Lock()
	defer cm.mu.Unlock()
	cm.m[key] = value
}

func (cm *ConcurrentMap) Get(key string) (interface{}, bool) {
	cm.mu.RLock()
	defer cm.mu.RUnlock()
	val, ok := cm.m[key]
	return val, ok
}

func (cm *ConcurrentMap) GetAllKey() []string {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	keys := make([]string, 0, len(cm.m))
	for k := range cm.m {
		keys = append(keys, k)
	}
	return keys
}

func (cm *ConcurrentMap) Delete(key string) {
	cm.mu.Lock()
	defer cm.mu.Unlock()
	delete(cm.m, key)
}
