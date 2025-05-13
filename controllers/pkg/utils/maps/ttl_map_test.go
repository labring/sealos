package maps

import (
	"sync"
	"testing"
	"time"
)

func TestNew(t *testing.T) {
	// Test that New creates a non-nil TTLMap with initialized map
	m := New[string](60)
	if m == nil {
		t.Fatal("New() returned nil")
	}
	if m.m == nil {
		t.Fatal("New() did not initialize map")
	}
	if len(m.m) != 0 {
		t.Errorf("New() initialized map with non-zero length: %d", len(m.m))
	}
}

func TestPutAndGet(t *testing.T) {
	m := New[string](60)

	// Test putting and getting a value
	m.Put("key1", "value1")
	if v, _ := m.Get("key1"); v != "value1" {
		t.Errorf("Get(key1) = %v; want value1", v)
	}

	// Test getting non-existent key
	if v, _ := m.Get("key2"); v != "" {
		t.Errorf("Get(key2) = %v; want nil", v)
	}

	// Test updating existing key
	m.Put("key1", "value2")
	if v, _ := m.Get("key1"); v != "value2" {
		t.Errorf("Get(key1) = %v; want value2", v)
	}
}

func TestLen(t *testing.T) {
	m := New[string](60)

	// Test initial length
	if l := m.Len(); l != 0 {
		t.Errorf("Len() = %d; want 0", l)
	}

	// Test length after adding items
	m.Put("key1", "value1")
	m.Put("key2", "value2")
	if l := m.Len(); l != 2 {
		t.Errorf("Len() = %d; want 2", l)
	}
}

func TestTTLExpiration(t *testing.T) {
	m := New[string](1) // 1 second TTL, large initial capacity
	var wg sync.WaitGroup
	const numOps = 500 // Number of concurrent operations

	// Concurrent writes
	for i := 0; i < numOps; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			key := string(rune('a'+(i%26))) + string(rune(i))
			m.Put(key, "value"+string(rune(i)))
		}(i)
	}

	// Wait for all writes to complete
	wg.Wait()

	// Verify some values are present immediately
	for i := 0; i < 10; i++ { // Check a subset to avoid long test duration
		key := string(rune('a'+(i%26))) + string(rune(i))
		if v, _ := m.Get(key); v == "" {
			t.Errorf("Get(%s) = nil; want non-nil value", key)
		}
	}

	// Concurrent reads during TTL period
	for i := 0; i < numOps; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			key := string(rune('a'+(i%26))) + string(rune(i))
			m.Get(key)
		}(i)
	}

	// Wait a bit less than TTL to ensure some reads keep items alive
	time.Sleep(500 * time.Millisecond)
	wg.Wait()

	// Verify length is still significant due to recent accesses
	if l := m.Len(); l < numOps/2 {
		t.Errorf("Len() = %d; want at least %d after partial expiration", l, numOps/2)
	}

	// Wait for full expiration (1 second TTL + buffer)
	time.Sleep(1500 * time.Millisecond)

	// Concurrent reads after expiration
	for i := 0; i < numOps; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			key := string(rune('a'+(i%26))) + string(rune(i))
			if v, _ := m.Get(key); v != "" {
				t.Errorf("Get(%s) = %v; want nil after expiration", key, v)
			}
		}(i)
	}

	wg.Wait()

	// Verify length is 0 after expiration
	if l := m.Len(); l != 0 {
		t.Errorf("Len() = %d; want 0 after expiration", l)
	}
}

func TestConcurrentAccess(t *testing.T) {
	m := New[int](60)
	var wg sync.WaitGroup

	// Number of concurrent operations
	const numOps = 100

	// Concurrent writes
	for i := 0; i < numOps; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			key := string(rune('a' + i%26))
			m.Put(key, i)
		}(i)
	}

	// Concurrent reads
	for i := 0; i < numOps; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			key := string(rune('a' + i%26))
			m.Get(key)
		}(i)
	}

	wg.Wait()

	// Verify some values
	for i := 0; i < 26; i++ {
		key := string(rune('a' + i))
		if v, _ := m.Get(key); v == 0 {
			t.Errorf("Get(%s) = nil; want non-nil value", key)
		}
	}
}

func TestLastAccessUpdate(t *testing.T) {
	m := New[string](2) // 2 second TTL

	// Put a value
	m.Put("key1", "TestLastAccessUpdatevalue1")

	// Get it multiple times to update lastAccess
	for i := 0; i < 3; i++ {
		time.Sleep(500 * time.Millisecond)
		if v, _ := m.Get("key1"); v != "TestLastAccessUpdatevalue1" {
			t.Errorf("Get(key1) = %v; want value1 at iteration %d", v, i)
		}
	}

	// Wait less than TTL
	time.Sleep(1500 * time.Millisecond)

	// Verify it's still there due to updated lastAccess
	if v, _ := m.Get("key1"); v != "value1" {
		t.Errorf("Get(key1) = %v; want value1 after access updates", v)
	}
}
