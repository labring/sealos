package datastore

import (
	"context"
	"errors"
	"time"

	"github.com/go-redis/redis/v8"
)

const (
	DefaultExpiration = 7 * 24 * time.Hour
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

// EnsureSetExpiration 确保Set键有过期时间，如果没有则设置为默认值
func (ds *DataStore) EnsureSetExpiration(key string) error {
	ctx := context.Background()

	// 使用TTL命令检查键的剩余生存时间
	ttl, err := ds.client.TTL(ctx, key).Result()
	if err != nil {
		return err
	}

	// 如果TTL返回-1，表示键存在但没有设置过期时间
	// 如果TTL返回-2，表示键不存在
	if ttl == -1 {
		// 键存在但没有过期时间，设置默认过期时间
		return ds.client.Expire(ctx, key, DefaultExpiration).Err()
	}

	// 键不存在或已经有过期时间，不需要操作
	return nil
}

// AddToSet 向Set中添加成员并确保有过期时间
func (ds *DataStore) AddToSet(key string, members ...interface{}) error {
	ctx := context.Background()

	// 添加成员到Set
	if err := ds.client.SAdd(ctx, key, members...).Err(); err != nil {
		return err
	}

	// 确保Set有过期时间
	return ds.EnsureSetExpiration(key)
}

// GetSetMembers 获取Set中的所有成员
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
