package rpmlimit

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/labring/sealos/service/aiproxy/common"
	log "github.com/sirupsen/logrus"
)

var inMemoryRateLimiter InMemoryRateLimiter

const (
	groupModelRPMKey = "group_model_rpm:%s:%s"
	overLimitRPMKey  = "over_limit_rpm:%s:%s"
)

var pushRequestScript = `
local key = KEYS[1]
local over_limit_key = KEYS[2]
local window = tonumber(ARGV[1])
local current_time = tonumber(ARGV[2])
local max_requests = tonumber(ARGV[3])
local cutoff = current_time - window

redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoff)
redis.call('ZREMRANGEBYSCORE', over_limit_key, '-inf', cutoff)
local count = redis.call('ZCOUNT', key, cutoff, current_time)
local over_limit_count = redis.call('ZCOUNT', over_limit_key, cutoff, current_time)

if count <= max_requests then
    redis.call('ZADD', key, current_time, current_time)
    redis.call('PEXPIRE', key, window / 1000)
	count = count + 1
else
    redis.call('ZADD', over_limit_key, current_time, current_time)
    redis.call('PEXPIRE', over_limit_key, window / 1000)
	over_limit_count = over_limit_count + 1
end

return string.format("%d:%d", count, over_limit_count)
`

var getRequestCountScript = `
local pattern = KEYS[1]
local over_limit_pattern = KEYS[2]
local window = tonumber(ARGV[1])
local current_time = tonumber(ARGV[2])
local cutoff = current_time - window

local total = 0

local keys = redis.call('KEYS', pattern)
for _, key in ipairs(keys) do
	redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoff)
    total = total + redis.call('ZCOUNT', key, cutoff, current_time)
end

local over_limit_keys = redis.call('KEYS', over_limit_pattern)
for _, key in ipairs(over_limit_keys) do
	redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoff)
    total = total + redis.call('ZCOUNT', key, cutoff, current_time)
end

return total
`

func GetRPM(ctx context.Context, group, model string) (int64, error) {
	if !common.RedisEnabled {
		return 0, nil
	}

	var pattern string
	var overLimitPattern string
	if group == "" && model == "" {
		pattern = "group_model_rpm:*:*"
		overLimitPattern = "over_limit_rpm:*:*"
	} else if group == "" {
		pattern = "group_model_rpm:*:" + model
		overLimitPattern = "over_limit_rpm:*:" + model
	} else if model == "" {
		pattern = fmt.Sprintf("group_model_rpm:%s:*", group)
		overLimitPattern = fmt.Sprintf("over_limit_rpm:%s:*", group)
	} else {
		pattern = fmt.Sprintf("group_model_rpm:%s:%s", group, model)
		overLimitPattern = fmt.Sprintf("over_limit_rpm:%s:%s", group, model)
	}

	rdb := common.RDB
	result, err := rdb.Eval(
		ctx,
		getRequestCountScript,
		[]string{pattern, overLimitPattern},
		time.Minute.Microseconds(),
		time.Now().UnixMicro(),
	).Int64()
	if err != nil {
		return 0, err
	}
	return result, nil
}

func redisRateLimitRequest(ctx context.Context, group, model string, maxRequestNum int64, duration time.Duration) (bool, error) {
	result, _, err := PushRequest(ctx, group, model, maxRequestNum, duration)
	if err != nil {
		return false, err
	}
	return result <= maxRequestNum, nil
}

func PushRequest(ctx context.Context, group, model string, maxRequestNum int64, duration time.Duration) (int64, int64, error) {
	result, err := common.RDB.Eval(
		ctx,
		pushRequestScript,
		[]string{
			fmt.Sprintf(groupModelRPMKey, group, model),
			fmt.Sprintf(overLimitRPMKey, group, model),
		},
		duration.Microseconds(),
		time.Now().UnixMicro(),
		maxRequestNum,
	).Text()
	if err != nil {
		return 0, 0, err
	}
	count, overLimitCount, ok := strings.Cut(result, ":")
	if !ok {
		return 0, 0, errors.New("invalid result")
	}
	countInt, err := strconv.ParseInt(count, 10, 64)
	if err != nil {
		return 0, 0, err
	}
	overLimitCountInt, err := strconv.ParseInt(overLimitCount, 10, 64)
	if err != nil {
		return 0, 0, err
	}
	return countInt, overLimitCountInt, nil
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
