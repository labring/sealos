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

var pushRequestScript = `
local key = KEYS[1]
local window = tonumber(ARGV[1])
local current_time = tonumber(ARGV[2])
local cutoff = current_time - window

local page_size = 100
local remove_count = 0

while true do
    local timestamps = redis.call('LRANGE', key, remove_count, remove_count + page_size - 1)
    if #timestamps == 0 then
        break
    end

    local found_non_expired = false
    for i = 1, #timestamps do
        local timestamp = tonumber(timestamps[i])
        if timestamp < cutoff then
            remove_count = remove_count + 1
        else
            found_non_expired = true
            break
        end
    end

    if found_non_expired then
        break
    end
end

if remove_count > 0 then
    redis.call('LTRIM', key, remove_count, -1)
end

redis.call('RPUSH', key, current_time)

redis.call('PEXPIRE', key, window)

return redis.call('LLEN', key)
`

var getRequestCountScript = `
local pattern = ARGV[1]
local window = tonumber(ARGV[2])
local current_time = tonumber(ARGV[3])
local cutoff = current_time - window
local page_size = 100

local keys = redis.call('KEYS', pattern)
local total = 0

for _, key in ipairs(keys) do
    local remove_count = 0

    while true do
        local timestamps = redis.call('LRANGE', key, remove_count, remove_count + page_size - 1)
        if #timestamps == 0 then
            break
        end
        
        local found_non_expired = false
        for i = 1, #timestamps do
            local timestamp = tonumber(timestamps[i])
            if timestamp < cutoff then
                remove_count = remove_count + 1
            else
                found_non_expired = true
                break
            end
        end
        
        if found_non_expired then
            break
        end
    end

    if remove_count > 0 then
        redis.call('LTRIM', key, remove_count, -1)
    end

    local total_count = redis.call('LLEN', key)
    total = total + total_count
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
	result, err := rdb.Eval(
		ctx,
		getRequestCountScript,
		[]string{},
		pattern,
		time.Minute.Milliseconds(),
		currentTime,
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
		duration.Milliseconds(),
		time.Now().UnixMilli(),
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
	inMemoryRateLimiter.Init(config.RateLimitKeyExpirationDuration)
	return inMemoryRateLimiter.Request(fmt.Sprintf(groupModelRPMKey, group, model), int(maxRequestNum), duration)
}
