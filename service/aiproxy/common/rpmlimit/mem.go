package rpmlimit

import (
	"sync"
	"time"
)

type InMemoryRateLimiter struct {
	store              map[string]*RateLimitWindow
	mutex              sync.RWMutex
	expirationDuration time.Duration
}

type RateLimitWindow struct {
	timestamps []int64
	lastAccess int64
}

func (l *InMemoryRateLimiter) Init(expirationDuration time.Duration) {
	if l.store == nil {
		l.mutex.Lock()
		if l.store == nil {
			l.store = make(map[string]*RateLimitWindow)
			l.expirationDuration = expirationDuration
			if expirationDuration > 0 {
				go l.clearExpiredItems()
			}
		}
		l.mutex.Unlock()
	}
}

func (l *InMemoryRateLimiter) clearExpiredItems() {
	ticker := time.NewTicker(l.expirationDuration)
	defer ticker.Stop()

	for range ticker.C {
		l.mutex.Lock()
		now := time.Now().Unix()
		for key, window := range l.store {
			if now-window.lastAccess > int64(l.expirationDuration.Seconds()) {
				delete(l.store, key)
			}
		}
		l.mutex.Unlock()
	}
}

// Request parameter duration's unit is seconds
func (l *InMemoryRateLimiter) Request(key string, maxRequestNum int, duration time.Duration) bool {
	now := time.Now().Unix()
	cutoff := now - int64(duration.Seconds())

	l.mutex.RLock()
	window, exists := l.store[key]
	l.mutex.RUnlock()

	if !exists {
		l.mutex.Lock()
		window = &RateLimitWindow{
			timestamps: make([]int64, 0, maxRequestNum),
			lastAccess: now,
		}
		l.store[key] = window
		window.timestamps = append(window.timestamps, now)
		l.mutex.Unlock()
		return true
	}

	l.mutex.Lock()
	defer l.mutex.Unlock()

	// Update last access time
	window.lastAccess = now

	// Remove expired timestamps
	idx := 0
	for i, ts := range window.timestamps {
		if ts > cutoff {
			idx = i
			break
		}
	}
	window.timestamps = window.timestamps[idx:]

	// Check if we can add a new request
	if len(window.timestamps) < maxRequestNum {
		window.timestamps = append(window.timestamps, now)
		return true
	}

	return false
}
