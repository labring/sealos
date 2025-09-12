package auth

import (
	"context"
	"crypto/sha256"
	"fmt"
	"time"

	"github.com/labring/sealos/service/hubble/pkg/cache"
)

type CacheAuth struct {
	auth  *Auth
	cache cache.Cache
	ttl   time.Duration
}

var (
	cacheEntryTTL   = 5 * time.Minute
	cleanupInterval = 10 * time.Minute
)

func NewCacheAuth(whiteList string) *CacheAuth {
	return &CacheAuth{
		auth:  NewAuth(whiteList),
		cache: cache.NewMemoryCache(cleanupInterval),
		ttl:   cacheEntryTTL,
	}
}

func getCacheKey(namespace, kubeconfig string) string {
	h := sha256.New()
	h.Write([]byte(kubeconfig))
	return fmt.Sprintf("auth:%s:%x", namespace, h.Sum(nil))
}

func (ca *CacheAuth) Authenticate(ctx context.Context, ns, kc string) (string, error) {
	var err error
	if ns == "" {
		ns, err = extractNamespaceFromKubeConfig(kc)
		if err != nil {
			return "", ErrNoNamespace
		}
	}

	cacheKey := getCacheKey(ns, kc)
	if cachedValue, found := ca.cache.Get(cacheKey); found {
		if cachedErr, ok := cachedValue.(error); ok {
			return "", cachedErr
		}

		if cachedBool, ok := cachedValue.(bool); ok && cachedBool {
			return ns, nil
		}

		return ns, ErrNoAuth
	}
	ns, err = ca.auth.Authenticate(ctx, ns, kc)
	if err == nil {
		ca.cache.Set(cacheKey, true, ca.ttl)
	} else {
		ca.cache.Set(cacheKey, err, ca.ttl)
	}
	return ns, err
}
