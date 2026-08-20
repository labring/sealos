// Copyright © 2026 sealos.
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

package usercount

import (
	"sync"
	"sync/atomic"

	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	toolscache "k8s.io/client-go/tools/cache"
)

// Counter tracks users that are present and not being deleted. It stores only
// object names so quota checks do not retain or copy User status fields.
type Counter struct {
	mu          sync.RWMutex
	users       map[string]struct{}
	count       atomic.Int64
	initialized atomic.Bool
}

func NewCounter() *Counter {
	return &Counter{users: make(map[string]struct{})}
}

func (c *Counter) Initialized() bool {
	return c != nil && c.initialized.Load()
}

func (c *Counter) Count() int {
	if c == nil {
		return 0
	}
	return int(c.count.Load())
}

func (c *Counter) CountExcluding(name string) int {
	if c == nil {
		return 0
	}

	c.mu.RLock()
	defer c.mu.RUnlock()
	count := int(c.count.Load())
	if _, ok := c.users[name]; ok {
		return count - 1
	}
	return count
}

// MarkInitialized marks the counter ready after the informer's initial events
// have been delivered to the counter's event handler.
func (c *Counter) MarkInitialized() {
	if c == nil {
		return
	}
	c.initialized.Store(true)
}

func (c *Counter) Add(obj any) {
	metadata, ok := objectMetadata(obj)
	if !ok {
		return
	}
	c.set(metadata.GetName(), isQuotaUser(metadata))
}

func (c *Counter) Update(oldObj, newObj any) {
	oldMetadata, oldOK := objectMetadata(oldObj)
	newMetadata, newOK := objectMetadata(newObj)
	if oldOK && newOK && oldMetadata.GetName() != newMetadata.GetName() {
		c.set(oldMetadata.GetName(), false)
	}
	if !newOK {
		return
	}
	c.set(newMetadata.GetName(), isQuotaUser(newMetadata))
}

func (c *Counter) Delete(obj any) {
	metadata, ok := objectMetadata(obj)
	if !ok {
		return
	}
	c.set(metadata.GetName(), false)
}

func (c *Counter) set(name string, present bool) {
	if c == nil || name == "" {
		return
	}

	c.mu.Lock()
	defer c.mu.Unlock()
	if c.users == nil {
		c.users = make(map[string]struct{})
	}
	if present {
		if _, ok := c.users[name]; ok {
			return
		}
		c.users[name] = struct{}{}
		c.count.Add(1)
		return
	}
	if _, ok := c.users[name]; !ok {
		return
	}
	delete(c.users, name)
	c.count.Add(-1)
}

func isQuotaUser(obj metav1.Object) bool {
	return obj.GetName() != "" &&
		(obj.GetDeletionTimestamp() == nil || obj.GetDeletionTimestamp().IsZero())
}

func objectMetadata(obj any) (metav1.Object, bool) {
	switch tombstone := obj.(type) {
	case toolscache.DeletedFinalStateUnknown:
		obj = tombstone.Obj
	case *toolscache.DeletedFinalStateUnknown:
		obj = tombstone.Obj
	}
	metadata, err := meta.Accessor(obj)
	return metadata, err == nil && metadata != nil
}

// The following process-local functions are retained for the license
// controller, which refreshes its own user count independently.
var (
	processUserCount            atomic.Int64
	processUserCountInitialized atomic.Uint32
)

func Initialized() bool {
	return processUserCountInitialized.Load() == 1
}

func Get() int {
	return int(processUserCount.Load())
}

func Set(count int) {
	processUserCount.Store(int64(count))
	processUserCountInitialized.Store(1)
}
