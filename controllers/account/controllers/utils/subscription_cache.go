package utils

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/labring/sealos/controllers/pkg/types"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CacheEntry holds the cached data for a user
type CacheEntry struct {
	UserUID  uuid.UUID
	Status   types.SubscriptionStatus
	PlanName string
}

// SubscriptionCache manages the in-memory cache with concurrent access safety
type SubscriptionCache struct {
	db           *gorm.DB
	cache        map[uuid.UUID]CacheEntry
	mu           sync.RWMutex // Protects cache for concurrent read/write
	lastUpdate   time.Time
	updateTicker *time.Ticker
}

// NewSubscriptionCache initializes the cache and starts the update goroutine
func NewSubscriptionCache(db *gorm.DB, updateInterval time.Duration) (*SubscriptionCache, error) {
	cache := &SubscriptionCache{
		db:           db,
		cache:        make(map[uuid.UUID]CacheEntry),
		lastUpdate:   time.Now(),
		updateTicker: time.NewTicker(updateInterval),
	}

	// Perform initial full cache load
	if err := cache.loadFullCache(context.Background()); err != nil {
		return nil, fmt.Errorf("failed to load initial cache: %w", err)
	}

	// Start background update goroutine
	go cache.runPeriodicUpdates(context.Background())

	return cache, nil
}

// loadFullCache loads all subscriptions into the cache
// Uses a write lock to ensure exclusive access during cache population
func (sc *SubscriptionCache) loadFullCache(ctx context.Context) error {
	var subscriptions []types.Subscription
	if err := sc.db.WithContext(ctx).Select("user_uid", "status", "plan_name").Find(&subscriptions).Error; err != nil {
		return err
	}

	sc.mu.Lock()
	defer sc.mu.Unlock()

	// Clear existing cache
	sc.cache = make(map[uuid.UUID]CacheEntry)

	// Populate cache
	for _, sub := range subscriptions {
		sc.cache[sub.UserUID] = CacheEntry{
			UserUID:  sub.UserUID,
			Status:   sub.Status,
			PlanName: sub.PlanName,
		}
	}

	sc.lastUpdate = time.Now()
	log.Printf("Full cache loaded with %d entries at %s", len(sc.cache), sc.lastUpdate.Format(time.RFC3339))
	return nil
}

// updateCacheSinceLast updates cache with subscriptions changed since last update
// Uses a write lock to ensure exclusive access during cache updates
func (sc *SubscriptionCache) updateCacheSinceLast(ctx context.Context) error {
	var subscriptions []types.Subscription
	currentTime := time.Now()

	// Fetch subscriptions where UpdateAt is between lastUpdate and currentTime
	if err := sc.db.WithContext(ctx).
		Select("user_uid", "status", "plan_name").
		Where("update_at > ? AND update_at <= ?", sc.lastUpdate, currentTime).
		Find(&subscriptions).Error; err != nil {
		return fmt.Errorf("failed to fetch updated subscriptions: %w", err)
	}

	sc.mu.Lock()
	defer sc.mu.Unlock()

	// Update cache with changed entries
	for _, sub := range subscriptions {
		if currentEntry, exists := sc.cache[sub.UserUID]; !exists || currentEntry.Status != sub.Status || currentEntry.PlanName != sub.PlanName {
			sc.cache[sub.UserUID] = CacheEntry{
				UserUID:  sub.UserUID,
				Status:   sub.Status,
				PlanName: sub.PlanName,
			}
			log.Printf("Updated cache for UserUID %s with status %s and plan_name %s", sub.UserUID, sub.Status, sub.PlanName)
		}
	}

	sc.lastUpdate = currentTime
	log.Printf("Cache updated with %d changed entries at %s", len(subscriptions), currentTime.Format(time.RFC3339))
	return nil
}

// runPeriodicUpdates runs periodic cache updates
// Handles updates in a background goroutine
func (sc *SubscriptionCache) runPeriodicUpdates(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			sc.updateTicker.Stop()
			log.Println("Cache update goroutine stopped")
			return
		case <-sc.updateTicker.C:
			if err := sc.updateCacheSinceLast(ctx); err != nil {
				log.Printf("Error updating cache: %v", err)
			}
		}
	}
}

// GetEntry retrieves the cache entry for a given UserUID
// Uses a read lock for concurrent-safe access
func (sc *SubscriptionCache) GetEntry(userUID uuid.UUID) (CacheEntry, bool) {
	sc.mu.RLock()
	defer sc.mu.RUnlock()

	entry, exists := sc.cache[userUID]
	return entry, exists
}

// GetAllEntries returns a copy of all cache entries
// Uses a read lock to ensure concurrent-safe access
func (sc *SubscriptionCache) GetAllEntries() []CacheEntry {
	sc.mu.RLock()
	defer sc.mu.RUnlock()

	entries := make([]CacheEntry, 0, len(sc.cache))
	for _, entry := range sc.cache {
		entries = append(entries, entry)
	}
	return entries
}

// Close stops the cache update ticker
func (sc *SubscriptionCache) Close() {
	sc.updateTicker.Stop()
	log.Println("Cache ticker stopped")
}

// Example usage
//func main() {
//	// Assuming db is a configured *gorm.DB instance
//	var db *gorm.DB // Initialize your GORM DB here
//
//	// Create cache with 1-minute update interval
//	cache, err := NewSubscriptionCache(db, time.Minute)
//	if err != nil {
//		log.Fatalf("Failed to initialize cache: %v", err)
//	}
//	defer cache.Close()
//
//	// Example: Retrieve entry for a user
//	userUID, _ := uuid.Parse("123e4567-e89b-12d3-a456-426614174000")
//	if entry, exists := cache.GetEntry(userUID); exists {
//		fmt.Printf("User %s has status %s and plan name %s\n", entry.UserUID, entry.Status, entry.PlanName)
//	} else {
//		fmt.Printf("User %s not found in cache\n", userUID)
//	}
//
//	// Example: Retrieve all entries
//	entries := cache.GetAllEntries()
//	for _, entry := range entries {
//		fmt.Printf("User %s: Status=%s, PlanName=%s\n", entry.UserUID, entry.Status, entry.PlanName)
//	}
//
//	// Keep the program running to allow periodic updates
//	select {}
//}
