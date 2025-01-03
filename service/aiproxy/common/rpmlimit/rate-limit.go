package rpmlimit

import (
	"context"
	"fmt"
	"time"

	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/config"
	log "github.com/sirupsen/logrus"
)

var inMemoryRateLimiter InMemoryRateLimiter

const (
	groupModelRPMKey = "group_model_rpm:%s:%s"
)

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

var getRPMSumLuaScript = `
local pattern = ARGV[1]
local window = tonumber(ARGV[2])
local current_time = tonumber(ARGV[3])

local keys = redis.call('KEYS', pattern)
local total = 0

for _, key in ipairs(keys) do
    local timestamps = redis.call('LRANGE', key, 0, -1)
    for _, ts in ipairs(timestamps) do
        if current_time - tonumber(ts) < window then
            total = total + 1
        end
    end
end

return total
`

func GetRPM(ctx context.Context, group, model string) (int64, error) {
	if !common.RedisEnabled {
		return 0, nil
	}

	var pattern string
	if group == "" && model == "" {
		pattern = "group_model_rpm:*:*"
	} else if group == "" {
		pattern = "group_model_rpm:*:" + model
	} else if model == "" {
		pattern = fmt.Sprintf("group_model_rpm:%s:*", group)
	} else {
		pattern = fmt.Sprintf("group_model_rpm:%s:%s", group, model)
	}

	rdb := common.RDB
	currentTime := time.Now().UnixMilli()
	result, err := rdb.Eval(ctx, getRPMSumLuaScript, []string{}, pattern, time.Minute.Milliseconds(), currentTime).Int64()
	if err != nil {
		return 0, err
	}

	return result, nil
}

func redisRateLimitRequest(ctx context.Context, group, model string, maxRequestNum int64, duration time.Duration) (bool, error) {
	rdb := common.RDB
	currentTime := time.Now().UnixMilli()
	result, err := rdb.Eval(ctx, luaScript, []string{
		fmt.Sprintf(groupModelRPMKey, group, model),
	}, maxRequestNum, duration.Milliseconds(), currentTime).Int64()
	if err != nil {
		return false, err
	}
	return result == 1, nil
}

func RateLimit(ctx context.Context, group, model string, maxRequestNum int64, duration time.Duration) (bool, error) {
	if maxRequestNum == 0 {
		return true, nil
	}
	if common.RedisEnabled {
		return redisRateLimitRequest(ctx, group, model, maxRequestNum, duration)
	}
	return MemoryRateLimit(ctx, group, model, maxRequestNum, duration), nil
}

// ignore redis error
func ForceRateLimit(ctx context.Context, group, model string, maxRequestNum int64, duration time.Duration) bool {
	if maxRequestNum == 0 {
		return true
	}
	if common.RedisEnabled {
		ok, err := redisRateLimitRequest(ctx, group, model, maxRequestNum, duration)
		if err == nil {
			return ok
		}
		log.Error("rate limit error: " + err.Error())
	}
	return MemoryRateLimit(ctx, group, model, maxRequestNum, duration)
}

func MemoryRateLimit(_ context.Context, group, model string, maxRequestNum int64, duration time.Duration) bool {
	// It's safe to call multi times.
	inMemoryRateLimiter.Init(config.RateLimitKeyExpirationDuration)
	return inMemoryRateLimiter.Request(fmt.Sprintf(groupModelRPMKey, group, model), int(maxRequestNum), duration)
}
