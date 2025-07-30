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

func (ds *DataStore) Set(key string, value string) error {
	ctx := context.Background()
	return ds.client.Set(ctx, key, value, DefaultExpiration).Err()
}

func (ds *DataStore) Get(key string) (string, bool, error) {
	ctx := context.Background()
	val, err := ds.client.Get(ctx, key).Result()
	if errors.Is(err, redis.Nil) {
		return "", false, nil
	} else if err != nil {
		return "", false, err
	}
	return val, true, nil
}

func (ds *DataStore) EnsureSetExpiration(key string) error {
	ctx := context.Background()

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

func (ds *DataStore) AddToSet(key string, members ...interface{}) error {
	ctx := context.Background()

	if err := ds.client.SAdd(ctx, key, members...).Err(); err != nil {
		return err
	}

	return ds.EnsureSetExpiration(key)
}

func (ds *DataStore) GetSetMembers(key string) ([]string, error) {
	ctx := context.Background()
	members, err := ds.client.SMembers(ctx, key).Result()
	if errors.Is(err, redis.Nil) {
		return []string{}, nil
	} else if err != nil {
		return nil, err
	}
	return members, nil
}
