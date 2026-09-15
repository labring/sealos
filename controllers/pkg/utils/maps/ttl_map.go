package maps

import (
	"sync"
	"time"
)

type item[T any] struct {
	value     T
	expiresAt int64
}

type TTLMap[T any] struct {
	m   map[string]*item[T]
	l   sync.RWMutex
	ttl time.Duration
}

func New[T any](maxTTL int) (m *TTLMap[T]) {
	m = &TTLMap[T]{
		m:   make(map[string]*item[T]),
		ttl: time.Duration(maxTTL) * time.Second,
	}
	go func() {
		for now := range time.Tick(2 * time.Second) {
			m.l.Lock()
			for k, v := range m.m {
				if now.UnixNano() >= v.expiresAt {
					delete(m.m, k)
				}
			}
			m.l.Unlock()
		}
	}()
	return m
}

func (m *TTLMap[T]) Len() int {
	m.l.RLock()
	defer m.l.RUnlock()
	return len(m.m)
}

func (m *TTLMap[T]) Put(k string, v T) {
	m.l.Lock()
	defer m.l.Unlock()
	m.m[k] = &item[T]{
		value:     v,
		expiresAt: time.Now().Add(m.ttl).UnixNano(),
	}
}

func (m *TTLMap[T]) Get(k string) (v T, ok bool) {
	m.l.RLock()
	defer m.l.RUnlock()
	it, ok := m.m[k]
	if !ok || time.Now().UnixNano() >= it.expiresAt {
		return v, false
	}
	return it.value, true
}
