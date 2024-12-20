package monitor

import (
	"context"
	"strings"
	"time"

	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/redis/go-redis/v9"
)

// 使用set存储被永久禁用的channelID
var addRequestScript = redis.NewScript(`
	local model = KEYS[1]
	local channel_id = ARGV[1]
	local error_time_to_live = tonumber(ARGV[2])
	local max_error_rate = tonumber(ARGV[3])
	local is_error = tonumber(ARGV[4])
	local ban_time = tonumber(ARGV[5])
	local banned_key = "model:" .. model .. ":banned"

	if redis.call("SISMEMBER", banned_key, channel_id) == 1 then
		return redis.status_reply("ok")
	end

	local now_ms = redis.call("TIME")[1] * 1000 + math.floor(redis.call("TIME")[2]/1000)
	local expired_time = now_ms - error_time_to_live
	local channel_requests_key = "model:" .. model .. ":channel:" .. channel_id .. ":requests"

	redis.call("ZREMRANGEBYSCORE", channel_requests_key, 0, expired_time)

	local request_data = string.format("%d:%d", now_ms, is_error)
	redis.call("ZADD", channel_requests_key, now_ms, request_data)
	redis.call("PEXPIRE", channel_requests_key, error_time_to_live)

	local total_count = redis.call("ZCARD", channel_requests_key)
	if total_count >= 5 then
		local error_count = 0
		local requests = redis.call("ZRANGE", channel_requests_key, 0, -1)
		for _, request in ipairs(requests) do
			local _, status = string.match(request, "(%d+):(%d+)")
			if tonumber(status) == 1 then
				error_count = error_count + 1
			end
		end
		local error_rate = error_count / total_count

		if error_rate >= max_error_rate then
			redis.call("SADD", banned_key, channel_id)
			if ban_time > 0 then
				redis.call("PEXPIRE", banned_key, ban_time)
			end
			redis.call("DEL", channel_requests_key)
		end
	end

	return redis.status_reply("ok")
`)

func AddRequest(ctx context.Context, model string, channelID int64, isError bool) error {
	if !common.RedisEnabled {
		return nil
	}
	errorFlag := 0
	if isError {
		errorFlag = 1
	}
	live := 60 * time.Second
	banTime := 4 * live
	return addRequestScript.Run(
		ctx,
		common.RDB,
		[]string{model},
		channelID,
		live.Milliseconds(),
		config.GetModelErrorAutoBanRate(),
		errorFlag,
		banTime.Milliseconds()).Err()
}

var getBannedChannelsScript = redis.NewScript(`
	local model = KEYS[1]
	local banned_key = "model:" .. model .. ":banned"
	
	return redis.call("SMEMBERS", banned_key)
`)

func GetBannedChannels(ctx context.Context, model string) ([]int64, error) {
	if !common.RedisEnabled {
		return nil, nil
	}
	result, err := getBannedChannelsScript.Run(ctx, common.RDB, []string{model}).Int64Slice()
	if err != nil {
		return nil, err
	}
	return result, nil
}

var clearChannelModelErrorsScript = redis.NewScript(`
	local model = KEYS[1]
	local channel_id = ARGV[1]
	local channel_requests_key = "model:" .. model .. ":channel:" .. channel_id .. ":requests"
	local banned_key = "model:" .. model .. ":banned"

	redis.call("DEL", channel_requests_key)
	redis.call("SREM", banned_key, channel_id)

	return redis.status_reply("ok")
`)

func ClearChannelModelErrors(ctx context.Context, model string, channelID int) error {
	if !common.RedisEnabled {
		return nil
	}
	return clearChannelModelErrorsScript.Run(ctx, common.RDB, []string{model}, channelID).Err()
}

var clearChannelAllModelErrorsScript = redis.NewScript(`
	local channel_id = ARGV[1]
	local banned_key = "model:*:banned"
	local channel_requests_pattern = "model:*:channel:" .. channel_id .. ":requests"

	local keys = redis.call("KEYS", channel_requests_pattern)
	for _, key in ipairs(keys) do
		redis.call("DEL", key)
	end
	redis.call("DEL", banned_key)

	return redis.status_reply("ok")
`)

func ClearChannelAllModelErrors(ctx context.Context, channelID int) error {
	if !common.RedisEnabled {
		return nil
	}
	return clearChannelAllModelErrorsScript.Run(ctx, common.RDB, []string{}, channelID).Err()
}

func GetAllBannedChannels(ctx context.Context) (map[string][]int64, error) {
	if !common.RedisEnabled {
		return nil, nil
	}

	result := make(map[string][]int64)
	iter := common.RDB.Scan(ctx, 0, "model:*:banned", 0).Iterator()
	for iter.Next(ctx) {
		key := iter.Val()
		model := strings.TrimPrefix(strings.TrimSuffix(key, ":banned"), "model:")

		channels, err := getBannedChannelsScript.Run(ctx, common.RDB, []string{model}).Int64Slice()
		if err != nil {
			return nil, err
		}
		result[model] = channels
	}

	if err := iter.Err(); err != nil {
		return nil, err
	}

	return result, nil
}
