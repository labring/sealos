package monitor

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/redis/go-redis/v9"
	log "github.com/sirupsen/logrus"
)

// Redis key prefixes and patterns
const (
	modelKeyPrefix        = "model:"
	bannedKeySuffix       = ":banned"
	statsKeySuffix        = ":stats"
	modelTotalStatsSuffix = ":total_stats"
	channelKeyPart        = ":channel:"
)

// Redis scripts
var (
	addRequestScript                 = redis.NewScript(addRequestLuaScript)
	getChannelModelErrorRateScript   = redis.NewScript(getChannelModelErrorRateLuaScript)
	getModelErrorRateScript          = redis.NewScript(getModelErrorRateLuaScript)
	getBannedChannelsScript          = redis.NewScript(getBannedChannelsLuaScript)
	clearChannelModelErrorsScript    = redis.NewScript(clearChannelModelErrorsLuaScript)
	clearChannelAllModelErrorsScript = redis.NewScript(clearChannelAllModelErrorsLuaScript)
	clearAllModelErrorsScript        = redis.NewScript(clearAllModelErrorsLuaScript)
)

func buildStatsKey(model string, channelID interface{}) string {
	return fmt.Sprintf("%s%s%s%v%s", modelKeyPrefix, model, channelKeyPart, channelID, statsKeySuffix)
}

// GetModelErrorRate gets error rate for a specific model across all channels
func GetModelsErrorRate(ctx context.Context) (map[string]float64, error) {
	if !common.RedisEnabled {
		return map[string]float64{}, nil
	}

	result := make(map[string]float64)
	pattern := modelKeyPrefix + "*" + modelTotalStatsSuffix

	iter := common.RDB.Scan(ctx, 0, pattern, 0).Iterator()
	for iter.Next(ctx) {
		key := iter.Val()
		parts := strings.Split(key, ":")
		if len(parts) != 3 || parts[2] != "total_stats" {
			continue
		}
		model := parts[1]

		rate, err := getModelErrorRateScript.Run(
			ctx,
			common.RDB,
			[]string{key},
			time.Now().UnixMilli(),
		).Float64()
		if err != nil {
			return nil, err
		}

		result[model] = rate
	}

	if err := iter.Err(); err != nil {
		return nil, err
	}

	return result, nil
}

func canAutoBan() int {
	if common.RedisEnabled && config.GetEnableModelErrorAutoBan() {
		return 1
	}
	return 0
}

// AddRequest adds a request record and checks if channel should be banned
func AddRequest(ctx context.Context, model string, channelID int64, isError bool) error {
	if !common.RedisEnabled {
		return nil
	}

	errorFlag := 0
	if isError {
		errorFlag = 1
	}

	now := time.Now().UnixMilli()
	val, err := addRequestScript.Run(
		ctx,
		common.RDB,
		[]string{model},
		channelID,
		errorFlag,
		now,
		config.GetModelErrorAutoBanRate(),
		time.Second.Milliseconds()*15,
		canAutoBan(),
	).Int64()
	if err != nil {
		return err
	}

	log.Debugf("add request result: %d", val)
	if val == 1 {
		log.Errorf("channel %d model %s is banned", channelID, model)
	}
	return nil
}

// GetChannelModelErrorRates gets error rates for a specific channel
func GetChannelModelErrorRates(ctx context.Context, channelID int64) (map[string]float64, error) {
	if !common.RedisEnabled {
		return map[string]float64{}, nil
	}

	result := make(map[string]float64)
	pattern := buildStatsKey("*", channelID)
	now := time.Now().UnixMilli()

	iter := common.RDB.Scan(ctx, 0, pattern, 0).Iterator()
	for iter.Next(ctx) {
		key := iter.Val()
		parts := strings.Split(key, ":")
		if len(parts) != 5 || parts[4] != "stats" {
			continue
		}
		model := parts[1]

		rate, err := getChannelModelErrorRateScript.Run(
			ctx,
			common.RDB,
			[]string{key},
			now,
		).Float64()
		if err != nil {
			return nil, err
		}

		result[model] = rate
	}

	if err := iter.Err(); err != nil {
		return nil, err
	}

	return result, nil
}

// GetBannedChannels gets banned channels for a specific model
func GetBannedChannels(ctx context.Context, model string) ([]int64, error) {
	if !common.RedisEnabled || !config.GetEnableModelErrorAutoBan() {
		return []int64{}, nil
	}
	result, err := getBannedChannelsScript.Run(ctx, common.RDB, []string{model}).Int64Slice()
	if err != nil {
		return nil, err
	}
	return result, nil
}

// ClearChannelModelErrors clears errors for a specific channel and model
func ClearChannelModelErrors(ctx context.Context, model string, channelID int) error {
	if !common.RedisEnabled {
		return nil
	}
	return clearChannelModelErrorsScript.Run(
		ctx,
		common.RDB,
		[]string{model},
		strconv.Itoa(channelID),
	).Err()
}

// ClearChannelAllModelErrors clears all errors for a specific channel
func ClearChannelAllModelErrors(ctx context.Context, channelID int) error {
	if !common.RedisEnabled {
		return nil
	}
	return clearChannelAllModelErrorsScript.Run(
		ctx,
		common.RDB,
		[]string{},
		strconv.Itoa(channelID),
	).Err()
}

// ClearAllModelErrors clears all error records
func ClearAllModelErrors(ctx context.Context) error {
	if !common.RedisEnabled {
		return nil
	}
	return clearAllModelErrorsScript.Run(ctx, common.RDB, []string{}).Err()
}

// GetAllBannedChannels gets all banned channels for all models
func GetAllBannedChannels(ctx context.Context) (map[string][]int64, error) {
	if !common.RedisEnabled || !config.GetEnableModelErrorAutoBan() {
		return map[string][]int64{}, nil
	}

	result := make(map[string][]int64)
	iter := common.RDB.Scan(ctx, 0, modelKeyPrefix+"*"+bannedKeySuffix, 0).Iterator()

	for iter.Next(ctx) {
		key := iter.Val()
		model := strings.Split(key, ":")[1]

		channels, err := getBannedChannelsScript.Run(
			ctx,
			common.RDB,
			[]string{model},
		).Int64Slice()
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

// GetAllChannelModelErrorRates gets error rates for all channels and models
func GetAllChannelModelErrorRates(ctx context.Context) (map[int64]map[string]float64, error) {
	if !common.RedisEnabled {
		return map[int64]map[string]float64{}, nil
	}

	result := make(map[int64]map[string]float64)
	pattern := modelKeyPrefix + "*" + channelKeyPart + "*" + statsKeySuffix
	now := time.Now().UnixMilli()

	iter := common.RDB.Scan(ctx, 0, pattern, 0).Iterator()
	for iter.Next(ctx) {
		key := iter.Val()
		parts := strings.Split(key, ":")
		if len(parts) != 5 || parts[4] != "stats" {
			continue
		}

		model := parts[1]
		channelID, err := strconv.ParseInt(parts[3], 10, 64)
		if err != nil {
			continue
		}

		rate, err := getChannelModelErrorRateScript.Run(
			ctx,
			common.RDB,
			[]string{key},
			now,
		).Float64()
		if err != nil {
			return nil, err
		}

		if _, exists := result[channelID]; !exists {
			result[channelID] = make(map[string]float64)
		}
		result[channelID][model] = rate
	}

	if err := iter.Err(); err != nil {
		return nil, err
	}

	return result, nil
}

// Lua scripts
const (
	addRequestLuaScript = `
local model = KEYS[1]
local channel_id = ARGV[1]
local is_error = tonumber(ARGV[2])
local now_ts = tonumber(ARGV[3])
local max_error_rate = tonumber(ARGV[4])
local statsExpiry = tonumber(ARGV[5])
local can_auto_ban = tonumber(ARGV[6])

local banned_key = "model:" .. model .. ":banned"
local stats_key = "model:" .. model .. ":channel:" .. channel_id .. ":stats"
local model_stats_key = "model:" .. model .. ":total_stats"
local maxSliceCount = 6
local current_slice = math.floor(now_ts / 1000)

if redis.call("SISMEMBER", banned_key, channel_id) == 1 then
    return 2
end

local function parse_req_err(value)
    if not value then return 0, 0 end
    local r, e = value:match("^(%d+):(%d+)$")
    return tonumber(r) or 0, tonumber(e) or 0
end

local function update_channel_stats()
    local req, err = parse_req_err(redis.call("HGET", stats_key, current_slice))
    req = req + 1
    err = err + (is_error == 1 and 1 or 0)
    redis.call("HSET", stats_key, current_slice, req .. ":" .. err)
    redis.call("PEXPIRE", stats_key, statsExpiry)
    return req, err
end

local function update_model_stats()
    local req, err = parse_req_err(redis.call("HGET", model_stats_key, current_slice))
    req = req + 1
    err = err + (is_error == 1 and 1 or 0)
    redis.call("HSET", model_stats_key, current_slice, req .. ":" .. err)
    redis.call("PEXPIRE", model_stats_key, statsExpiry)
    return req, err
end

update_channel_stats()
update_model_stats()

if is_error == 0 or can_auto_ban == 0 then
    return 0
end

local function check_channel_error()
    local total_req, total_err = 0, 0
    local min_valid_slice = current_slice - maxSliceCount
    
    local all_slices = redis.call("HGETALL", stats_key)
    local to_delete = {}
    
    for i = 1, #all_slices, 2 do
        local slice = tonumber(all_slices[i])
        if slice < min_valid_slice then
            table.insert(to_delete, all_slices[i])
        else
            local req, err = parse_req_err(all_slices[i+1])
            total_req = total_req + req
            total_err = total_err + err
        end
    end
    
    if #to_delete > 0 then
        redis.call("HDEL", stats_key, unpack(to_delete))
    end
    
    if total_req >= 10 and (total_err / total_req) >= max_error_rate then
        redis.call("SADD", banned_key, channel_id)
        redis.call("DEL", stats_key)
        return true
    end
    return false
end

if check_channel_error() then
    return 1
end
return 0
`

	getModelErrorRateLuaScript = `
local model_stats_key = KEYS[1]
local now_ts = tonumber(ARGV[1])
local maxSliceCount = 6
local current_slice = math.floor(now_ts / 1000)
local min_valid_slice = current_slice - maxSliceCount

local function parse_req_err(value)
    if not value then return 0, 0 end
    local r, e = value:match("^(%d+):(%d+)$")
    return tonumber(r) or 0, tonumber(e) or 0
end

local total_req, total_err = 0, 0
local all_slices = redis.call("HGETALL", model_stats_key)

for i = 1, #all_slices, 2 do
    local slice = tonumber(all_slices[i])
    if slice >= min_valid_slice then
        local req, err = parse_req_err(all_slices[i+1])
        total_req = total_req + req
        total_err = total_err + err
    end
end

if total_req == 0 then return 0 end
return total_err / total_req
`

	getChannelModelErrorRateLuaScript = `
local stats_key = KEYS[1]
local now_ts = tonumber(ARGV[1])
local maxSliceCount = 6
local current_slice = math.floor(now_ts / 1000)
local min_valid_slice = current_slice - maxSliceCount

local function parse_req_err(value)
    if not value then return 0, 0 end
    local r, e = value:match("^(%d+):(%d+)$")
    return tonumber(r) or 0, tonumber(e) or 0
end

local total_req, total_err = 0, 0
local all_slices = redis.call("HGETALL", stats_key)

for i = 1, #all_slices, 2 do
    local slice = tonumber(all_slices[i])
    if slice >= min_valid_slice then
        local req, err = parse_req_err(all_slices[i+1])
        total_req = total_req + req
        total_err = total_err + err
    end
end

if total_req == 0 then return 0 end
return string.format("%.2f", total_err / total_req)
`

	getBannedChannelsLuaScript = `
local model = KEYS[1]
return redis.call("SMEMBERS", "model:" .. model .. ":banned")
`

	clearChannelModelErrorsLuaScript = `
local model = KEYS[1]
local channel_id = ARGV[1]
local stats_key = "model:" .. model .. ":channel:" .. channel_id .. ":stats"
local banned_key = "model:" .. model .. ":banned"

redis.call("DEL", stats_key)
redis.call("SREM", banned_key, channel_id)
return redis.status_reply("ok")
`

	clearChannelAllModelErrorsLuaScript = `
local channel_id = ARGV[1]
local pattern = "model:*:channel:" .. channel_id .. ":stats"
local keys = redis.call("KEYS", pattern)

for _, key in ipairs(keys) do
    redis.call("DEL", key)
    local model = string.match(key, "model:(.*):channel:")
    if model then
        redis.call("SREM", "model:"..model..":banned", channel_id)
    end
end
return redis.status_reply("ok")
`

	clearAllModelErrorsLuaScript = `
local function del_keys(pattern)
    local keys = redis.call("KEYS", pattern)
    if #keys > 0 then redis.call("DEL", unpack(keys)) end
end

del_keys("model:*:channel:*:stats")
del_keys("model:*:banned")

return redis.status_reply("ok")
`
)
