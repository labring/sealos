package utils

import (
	"sync"
	"time"
)

type MapWithReset struct {
	mu    sync.Mutex
	items map[interface{}]int64
}

func NewMapWithReset() *MapWithReset {
	return &MapWithReset{
		items: make(map[interface{}]int64),
		mu:    sync.Mutex{},
	}
}

func (m *MapWithReset) Increment(key interface{}) int64 {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.items[key]++
	return m.items[key]
}

func (m *MapWithReset) Get(key interface{}) int64 {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.items[key]
}

func (m *MapWithReset) Reset() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.items = make(map[interface{}]int64)
}

func (m *MapWithReset) StartResetTimer(duration time.Duration) {
	ticker := time.NewTicker(duration)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			m.Reset()
		}
	}
}
