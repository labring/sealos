package maps

import (
	"sync"
	"time"
)

type item[T any] struct {
	value      T
	lastAccess int64
}

type TTLMap[T any] struct {
	m map[string]*item[T]
	l sync.RWMutex
}

func New[T any](maxTTL int) (m *TTLMap[T]) {
	m = &TTLMap[T]{m: make(map[string]*item[T])}
	go func() {
		for now := range time.Tick(2 * time.Second) {
			m.l.Lock()
			for k, v := range m.m {
				if now.Unix()-v.lastAccess > int64(maxTTL) {
					delete(m.m, k)
				}
			}
			m.l.Unlock()
		}
	}()
	return
}

func (m *TTLMap[T]) Len() int {
	return len(m.m)
}

func (m *TTLMap[T]) Put(k string, v T) {
	m.l.Lock()
	defer m.l.Unlock()
	it := &item[T]{value: v}
	it.lastAccess = time.Now().Unix()
	m.m[k] = it
}

func (m *TTLMap[T]) Get(k string) (v T, ok bool) {
	m.l.RLock()
	defer m.l.RUnlock()
	it, ok := m.m[k]
	if ok {
		v = it.value
		it.lastAccess = time.Now().Unix()
	}
	return v, ok
}
