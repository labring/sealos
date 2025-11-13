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

package server

import (
	"fmt"
	"sort"
	"sync"
	"testing"
	"time"

	rtype "github.com/docker/docker/api/types/registry"

	name "github.com/google/go-containerregistry/pkg/name"

	"github.com/labring/image-cri-shim/pkg/types"
)

type manifestStub struct {
	mu    sync.Mutex
	calls map[string]int
}

func (m *manifestStub) handler(image string, auth map[string]rtype.AuthConfig) (string, []byte, *rtype.AuthConfig, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.calls == nil {
		m.calls = make(map[string]int)
	}
	m.calls[image]++

	if len(auth) == 0 {
		return image, nil, nil, fmt.Errorf("no auth config provided")
	}

	ref, err := name.ParseReference(image)
	if err != nil {
		return "", nil, nil, err
	}
	domain, cfg := pickFirstAuth(auth)

	newImage := domain + "/" + ref.Context().RepositoryStr() + referenceSuffix(ref)
	cfgCopy := cfg
	return newImage, []byte("stub"), &cfgCopy, nil
}

func (m *manifestStub) callCount(image string) int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.calls[image]
}

func pickFirstAuth(auth map[string]rtype.AuthConfig) (string, rtype.AuthConfig) {
	keys := make([]string, 0, len(auth))
	for key := range auth {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	key := keys[0]
	return key, auth[key]
}

func withManifestStub(tb testing.TB, fn func(*manifestStub)) {
	tb.Helper()
	original := craneGetImageManifest
	stub := &manifestStub{}
	craneGetImageManifest = stub.handler
	defer func() {
		craneGetImageManifest = original
	}()
	fn(stub)
}

func newImageServiceForTest(auth *types.ShimAuthConfig) *v1ImageService {
	store := NewAuthStore(auth)
	service := newV1ImageService(nil, store, CacheOptions{})
	service.setMaxCacheSize(32)
	service.cacheTTL = 200 * time.Millisecond
	return service
}
