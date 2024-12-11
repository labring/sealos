package middleware

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/config"
	log "github.com/sirupsen/logrus"
)

var inMemoryRateLimiter common.InMemoryRateLimiter

// 1. 使用Redis列表存储请求时间戳
// 2. 列表长度代表当前窗口内的请求数
// 3. 如果请求数未达到限制，直接添加新请求并返回成功
// 4. 如果达到限制，则检查最老的请求是否已经过期
// 5. 如果最老的请求已过期，移除它并添加新请求，否则拒绝新请求
// 6. 通过EXPIRE命令设置键的过期时间，自动清理过期数据
var luaScript = `
local key = KEYS[1]
local max_requests = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local current_time = tonumber(ARGV[3])

local count = redis.call('LLEN', key)

if count < max_requests then
    redis.call('LPUSH', key, current_time)
    redis.call('PEXPIRE', key, window)
    return 1
else
    local oldest = redis.call('LINDEX', key, -1)
    if current_time - tonumber(oldest) >= window then
        redis.call('LPUSH', key, current_time)
        redis.call('LTRIM', key, 0, max_requests - 1)
		redis.call('PEXPIRE', key, window)
        return 1
    else
        return 0
    end
end
`

func redisRateLimitRequest(ctx context.Context, key string, maxRequestNum int, duration time.Duration) (bool, error) {
	rdb := common.RDB
	currentTime := time.Now().UnixMilli()
	result, err := rdb.Eval(ctx, luaScript, []string{key}, maxRequestNum, duration.Milliseconds(), currentTime).Int64()
	if err != nil {
		return false, err
	}
	return result == 1, nil
}

func RateLimit(ctx context.Context, key string, maxRequestNum int, duration time.Duration) (bool, error) {
	if maxRequestNum == 0 {
		return true, nil
	}
	if common.RedisEnabled {
		return redisRateLimitRequest(ctx, key, maxRequestNum, duration)
	}
	return MemoryRateLimit(ctx, key, maxRequestNum, duration), nil
}

// ignore redis error
func ForceRateLimit(ctx context.Context, key string, maxRequestNum int, duration time.Duration) bool {
	if maxRequestNum == 0 {
		return true
	}
	if common.RedisEnabled {
		ok, err := redisRateLimitRequest(ctx, key, maxRequestNum, duration)
		if err == nil {
			return ok
		}
		log.Error("rate limit error: " + err.Error())
	}
	return MemoryRateLimit(ctx, key, maxRequestNum, duration)
}

func MemoryRateLimit(_ context.Context, key string, maxRequestNum int, duration time.Duration) bool {
	// It's safe to call multi times.
	inMemoryRateLimiter.Init(config.RateLimitKeyExpirationDuration)
	return inMemoryRateLimiter.Request(key, maxRequestNum, duration)
}

func GlobalAPIRateLimit(c *gin.Context) {
	globalAPIRateLimitNum := config.GetGlobalAPIRateLimitNum()
	if globalAPIRateLimitNum <= 0 {
		c.Next()
		return
	}
	ok := ForceRateLimit(c.Request.Context(), "global_qpm", int(globalAPIRateLimitNum), time.Minute)
	if !ok {
		c.Status(http.StatusTooManyRequests)
		c.Abort()
		return
	}
	c.Next()
}
