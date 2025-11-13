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
