package rpmlimit

import (
	"context"
	"fmt"
	"time"

	"github.com/labring/sealos/service/aiproxy/common"
	log "github.com/sirupsen/logrus"
)

var inMemoryRateLimiter InMemoryRateLimiter

const (
	groupModelRPMKey = "group_model_rpm:%s:%s"
)

var pushRequestScript = `
local key = KEYS[1]
local window = tonumber(ARGV[1])
local current_time = tonumber(ARGV[2])
local cutoff = current_time - window

redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoff)
redis.call('ZADD', key, current_time, current_time)
redis.call('PEXPIRE', key, window)
return redis.call('ZCOUNT', key, cutoff, current_time)
`

var getRequestCountScript = `
local pattern = ARGV[1]
local window = tonumber(ARGV[2])
local current_time = tonumber(ARGV[3])
local cutoff = current_time - window

local keys = redis.call('KEYS', pattern)
local total = 0

for _, key in ipairs(keys) do
	redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoff)
    local count = redis.call('ZCOUNT', key, cutoff, current_time)
    total = total + count
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
	result, err := rdb.Eval(
		ctx,
		getRequestCountScript,
		[]string{},
		pattern,
		time.Minute.Microseconds(),
		time.Now().UnixMicro(),
	).Int64()
	if err != nil {
		return 0, err
	}
	return result, nil
}

func redisRateLimitRequest(ctx context.Context, group, model string, maxRequestNum int64, duration time.Duration) (bool, error) {
	result, err := PushRequest(ctx, group, model, duration)
	if err != nil {
		return false, err
	}
	return result <= maxRequestNum, nil
}

func PushRequest(ctx context.Context, group, model string, duration time.Duration) (int64, error) {
	result, err := common.RDB.Eval(
		ctx,
		pushRequestScript,
		[]string{
			fmt.Sprintf(groupModelRPMKey, group, model),
		},
		duration.Microseconds(),
		time.Now().UnixMicro(),
	).Int64()
	if err != nil {
		return 0, err
	}
	return result, nil
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
	inMemoryRateLimiter.Init(3 * time.Minute)
	return inMemoryRateLimiter.Request(fmt.Sprintf(groupModelRPMKey, group, model), int(maxRequestNum), duration)
}
