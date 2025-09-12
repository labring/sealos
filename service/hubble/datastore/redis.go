package datastore

import (
	"context"
	"errors"
	"time"

	"github.com/go-redis/redis/v8"
)

const (
	DefaultExpiration = 90 * 24 * time.Hour
)

type DataStore struct {
	client *redis.Client
}

func NewDataStore(client *redis.Client) *DataStore {
	return &DataStore{
		client: client,
	}
}

func (ds *DataStore) Set(ctx context.Context, key, value string) error {
	return ds.client.Set(ctx, key, value, DefaultExpiration).Err()
}

func (ds *DataStore) Get(ctx context.Context, key string) (string, bool, error) {
	val, err := ds.client.Get(ctx, key).Result()
	if errors.Is(err, redis.Nil) {
		return "", false, nil
	} else if err != nil {
		return "", false, err
	}
	return val, true, nil
}

func (ds *DataStore) EnsureSetExpiration(ctx context.Context, key string) error {
	ttl, err := ds.client.TTL(ctx, key).Result()
	if err != nil {
		return err
	}

	// If TTL returns -1, it means the key exists but has no expiration time
	// If TTL returns -2, it means the key does not exist
	if ttl == -1 {
		// Key exists but has no expiration time, set default expiration
		return ds.client.Expire(ctx, key, DefaultExpiration).Err()
	}

	// Key does not exist or already has an expiration time, no action needed
	return nil
}

// AddToSet adds members to a Redis set and refreshes its expiration time.
// Each time new data is added, the set's TTL is reset to DefaultExpiration,
// ensuring the set remains available as long as it's actively being updated.
func (ds *DataStore) AddToSet(ctx context.Context, key string, members ...any) error {
	pipe := ds.client.Pipeline()
	pipe.SAdd(ctx, key, members...)
	pipe.Expire(ctx, key, DefaultExpiration)
	_, err := pipe.Exec(ctx)
	return err
}

func (ds *DataStore) GetSetMembers(ctx context.Context, key string) ([]string, error) {
	members, err := ds.client.SMembers(ctx, key).Result()
	if errors.Is(err, redis.Nil) {
		return []string{}, nil
	} else if err != nil {
		return nil, err
	}
	return members, nil
}
