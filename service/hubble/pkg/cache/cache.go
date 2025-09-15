package cache

import (
	"sync"
	"time"
)

type MemoryCache struct {
	data            map[string]cacheItem
	mutex           sync.RWMutex
	cleanupInterval time.Duration
	stopCleanup     chan struct{}
}

type cacheItem struct {
	value  any
	expiry time.Time
}

func NewMemoryCache(cleanupInterval time.Duration) *MemoryCache {
	cache := &MemoryCache{
		data:            make(map[string]cacheItem),
		cleanupInterval: cleanupInterval,
		stopCleanup:     make(chan struct{}),
	}

	go cache.startCleanupTimer()
	return cache
}

func (c *MemoryCache) startCleanupTimer() {
	ticker := time.NewTicker(c.cleanupInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			c.cleanup()
		case <-c.stopCleanup:
			return
		}
	}
}

func (c *MemoryCache) cleanup() {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	now := time.Now()
	for key, item := range c.data {
		if item.expiry.Before(now) {
			delete(c.data, key)
		}
	}
}

func (c *MemoryCache) Get(key string) (any, bool) {
	c.mutex.RLock()
	defer c.mutex.RUnlock()

	item, found := c.data[key]
	if !found {
		return nil, false
	}

	if time.Now().After(item.expiry) {
		return nil, false
	}

	return item.value, true
}

func (c *MemoryCache) Set(key string, value any, ttl time.Duration) {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	c.data[key] = cacheItem{
		value:  value,
		expiry: time.Now().Add(ttl),
	}
}

func (c *MemoryCache) Delete(key string) {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	delete(c.data, key)
}

func (c *MemoryCache) Clear() {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	c.data = make(map[string]cacheItem)
}
