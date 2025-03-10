package trylock

import (
	"context"
	"sync"
	"time"

	"github.com/labring/sealos/service/aiproxy/common"
	log "github.com/sirupsen/logrus"
)

var memRecord = sync.Map{}

func init() {
	go cleanMemLock()
}

func cleanMemLock() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for now := range ticker.C {
		memRecord.Range(func(key, value any) bool {
			if exp, ok := value.(time.Time); ok {
				if now.After(exp) {
					memRecord.Delete(key)
				}
			} else {
				memRecord.Delete(key)
			}
			return true
		})
	}
}

func MemLock(key string, expiration time.Duration) bool {
	now := time.Now()
	newExpiration := now.Add(expiration)

	for {
		actual, loaded := memRecord.LoadOrStore(key, newExpiration)
		if !loaded {
			return true
		}
		oldExpiration, ok := actual.(time.Time)
		if !ok {
			memRecord.Delete(key)
			continue
		}
		if now.After(oldExpiration) {
			if memRecord.CompareAndSwap(key, actual, newExpiration) {
				return true
			}
			continue
		}
		return false
	}
}

func Lock(key string, expiration time.Duration) bool {
	if !common.RedisEnabled {
		return MemLock(key, expiration)
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	result, err := common.RDB.SetNX(ctx, key, true, expiration).Result()
	if err != nil {
		if MemLock("lockerror", time.Second*3) {
			log.Errorf("try notify error: %v", err)
		}
		return MemLock(key, expiration)
	}
	return result
}
