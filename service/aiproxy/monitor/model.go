package monitor

import (
	"context"
	"time"

	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/redis/go-redis/v9"
)

// 每个channelID使用单独的list存储错误时间戳
// 使用hash存储每个channelID的错误计数
var addErrorScript = redis.NewScript(`
	local model = KEYS[1]
	local channel_id = ARGV[1]
	local error_time_to_live = tonumber(ARGV[2])
	local channel_errors_key = "model:" .. model .. ":channel:" .. channel_id .. ":errors"
	local counts_key = "model:" .. model .. ":counts"
	local now = redis.call("TIME")
	local now_ms = tonumber(now[1]) * 1000 + math.floor(tonumber(now[2])/1000)

	-- 清理过期数据
	local expired_time = now_ms - error_time_to_live
	local expired_count = 0
	local timestamps = redis.call("LRANGE", channel_errors_key, 0, -1)
	for i = #timestamps, 1, -1 do
		if tonumber(timestamps[i]) < expired_time then
			redis.call("LREM", channel_errors_key, 1, timestamps[i])
			expired_count = expired_count + 1
		end
	end

	if expired_count > 0 then
		local count = redis.call("HGET", counts_key, channel_id)
		if count then
			count = tonumber(count)
			if count > expired_count then
				redis.call("HINCRBY", counts_key, channel_id, -expired_count)
			else
				redis.call("HDEL", counts_key, channel_id)
			end
		end
	end

	-- 添加新的错误记录
	redis.call("LPUSH", channel_errors_key, now_ms)
	redis.call("HINCRBY", counts_key, channel_id, 1)

	-- 设置过期时间
	redis.call("PEXPIRE", channel_errors_key, error_time_to_live)
	redis.call("PEXPIRE", counts_key, error_time_to_live)

	return redis.status_reply("ok")
`)

func AddError(ctx context.Context, model string, channelID int64, errorTimeToLive time.Duration) error {
	if !common.RedisEnabled {
		return nil
	}
	return addErrorScript.Run(ctx, common.RDB, []string{model}, channelID, errorTimeToLive.Milliseconds()).Err()
}

var getChannelsWithErrorsScript = redis.NewScript(`
	local model = KEYS[1]
	local error_time_to_live = tonumber(ARGV[1])
	local max_errors = tonumber(ARGV[2])
	local counts_key = "model:" .. model .. ":counts"
	local now = redis.call("TIME")
	local now_ms = tonumber(now[1]) * 1000 + math.floor(tonumber(now[2])/1000)
	local expired_time = now_ms - error_time_to_live

	-- 获取所有channel
	local counts = redis.call("HGETALL", counts_key)
	local result = {}
	
	-- 遍历每个channel，清理过期数据并检查错误数
	for i = 1, #counts, 2 do
		local channel_id = counts[i]
		local channel_errors_key = "model:" .. model .. ":channel:" .. channel_id .. ":errors"
		
		-- 清理过期数据
		local expired_count = 0
		local timestamps = redis.call("LRANGE", channel_errors_key, 0, -1)
		for j = #timestamps, 1, -1 do
			if tonumber(timestamps[j]) < expired_time then
				redis.call("LREM", channel_errors_key, 1, timestamps[j])
				expired_count = expired_count + 1
			end
		end

		-- 更新错误计数
		local count = tonumber(counts[i + 1])
		if expired_count > 0 then
			if count > expired_count then
				count = count - expired_count
				redis.call("HINCRBY", counts_key, channel_id, -expired_count)
			else
				count = 0
				redis.call("HDEL", counts_key, channel_id)
			end
		end

		if count >= max_errors then
			table.insert(result, channel_id)
		end
	end

	return result
`)

func GetChannelsWithErrors(ctx context.Context, model string, errorTimeToLive time.Duration, maxErrors int64) ([]int64, error) {
	if !common.RedisEnabled {
		return nil, nil
	}
	result, err := getChannelsWithErrorsScript.Run(ctx, common.RDB, []string{model}, errorTimeToLive.Milliseconds(), maxErrors).Int64Slice()
	if err != nil {
		return nil, err
	}
	return result, nil
}

var clearChannelErrorsScript = redis.NewScript(`
	local model = KEYS[1]
	local channel_id = ARGV[1]
	local channel_errors_key = "model:" .. model .. ":channel:" .. channel_id .. ":errors"
	local counts_key = "model:" .. model .. ":counts"

	redis.call("DEL", channel_errors_key)
	redis.call("HDEL", counts_key, channel_id)

	return redis.status_reply("ok")
`)

func ClearChannelErrors(ctx context.Context, model string, channelID int) error {
	if !common.RedisEnabled {
		return nil
	}
	return clearChannelErrorsScript.Run(ctx, common.RDB, []string{model}, channelID).Err()
}
