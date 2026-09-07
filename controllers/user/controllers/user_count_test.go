// Copyright 2026 labring.
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

package controllers

import (
	"context"
	"testing"

	"github.com/labring/sealos/controllers/user/pkg/usercount"
	toolscache "k8s.io/client-go/tools/cache"
	ctrlcache "sigs.k8s.io/controller-runtime/pkg/cache"
)

type stubCache struct {
	ctrlcache.Cache
	synced bool
}

func (c *stubCache) WaitForCacheSync(context.Context) bool {
	return c.synced
}

type stubHandlerRegistration struct {
	synced bool
}

func (r stubHandlerRegistration) HasSynced() bool {
	return r.synced
}

func TestUserCountCacheWaitForCacheSync(t *testing.T) {
	tests := []struct {
		name          string
		cacheSynced   bool
		handlerSynced bool
		wantReady     bool
	}{
		{
			name:          "cache not synced",
			cacheSynced:   false,
			handlerSynced: true,
		},
		{
			name:          "handler not synced",
			cacheSynced:   true,
			handlerSynced: false,
		},
		{
			name:          "cache and handler synced",
			cacheSynced:   true,
			handlerSynced: true,
			wantReady:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			counter := usercount.NewCounter()
			cache := &userCountCache{
				Cache:               &stubCache{synced: tt.cacheSynced},
				counter:             counter,
				handlerRegistration: stubHandlerRegistration{synced: tt.handlerSynced},
			}
			ctx := context.Background()
			if !tt.handlerSynced {
				var cancel context.CancelFunc
				ctx, cancel = context.WithCancel(ctx)
				cancel()
			}

			if got := cache.WaitForCacheSync(ctx); got != tt.wantReady {
				t.Fatalf("WaitForCacheSync() = %v, want %v", got, tt.wantReady)
			}
			if got := counter.Initialized(); got != tt.wantReady {
				t.Fatalf("counter.Initialized() = %v, want %v", got, tt.wantReady)
			}
		})
	}
}

var _ toolscache.ResourceEventHandlerRegistration = stubHandlerRegistration{}
