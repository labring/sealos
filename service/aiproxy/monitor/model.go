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
	getErrorRateScript               = redis.NewScript(getErrorRateLuaScript)
	clearChannelModelErrorsScript    = redis.NewScript(clearChannelModelErrorsLuaScript)
	clearChannelAllModelErrorsScript = redis.NewScript(clearChannelAllModelErrorsLuaScript)
	clearAllModelErrorsScript        = redis.NewScript(clearAllModelErrorsLuaScript)
)

// GetModelErrorRate gets error rate for a specific model across all channels
func GetModelsErrorRate(ctx context.Context) (map[string]float64, error) {
	if !common.RedisEnabled {
		return memModelMonitor.GetModelsErrorRate(ctx)
	}

	result := make(map[string]float64)
	pattern := modelKeyPrefix + "*" + modelTotalStatsSuffix

	now := time.Now().UnixMilli()

	iter := common.RDB.Scan(ctx, 0, pattern, 0).Iterator()
	for iter.Next(ctx) {
		key := iter.Val()
		model := strings.TrimPrefix(key, modelKeyPrefix)
		model = strings.TrimSuffix(model, modelTotalStatsSuffix)

		rate, err := getErrorRateScript.Run(
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

func canBan() int {
	if config.GetEnableModelErrorAutoBan() {
		return 1
	}
	return 0
}

// AddRequest adds a request record and checks if channel should be banned
func AddRequest(ctx context.Context, model string, channelID int64, isError, tryBan bool) (beyondThreshold bool, banExecution bool, err error) {
	if !common.RedisEnabled {
		beyondThreshold, banExecution = memModelMonitor.AddRequest(model, channelID, isError, tryBan)
		return beyondThreshold, banExecution, nil
	}

	errorFlag := 0
	if isError {
		errorFlag = 1
	} else {
		tryBan = false
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
		canBan(),
		tryBan,
	).Int64()
	if err != nil {
		return false, false, err
	}
	return val == 3, val == 1, nil
}

func buildStatsKey(model string, channelID string) string {
	return fmt.Sprintf("%s%s%s%v%s", modelKeyPrefix, model, channelKeyPart, channelID, statsKeySuffix)
}

func getModelChannelID(key string) (string, int64, bool) {
	content := strings.TrimPrefix(key, modelKeyPrefix)
	content = strings.TrimSuffix(content, statsKeySuffix)
	model, channelIDStr, ok := strings.Cut(content, channelKeyPart)
	if !ok {
		return "", 0, false
	}
	channelID, err := strconv.ParseInt(channelIDStr, 10, 64)
	if err != nil {
		return "", 0, false
	}
	return model, channelID, true
}

// GetChannelModelErrorRates gets error rates for a specific channel
func GetChannelModelErrorRates(ctx context.Context, channelID int64) (map[string]float64, error) {
	if !common.RedisEnabled {
		return memModelMonitor.GetChannelModelErrorRates(ctx, channelID)
	}

	result := make(map[string]float64)
	pattern := buildStatsKey("*", strconv.FormatInt(channelID, 10))
	now := time.Now().UnixMilli()

	iter := common.RDB.Scan(ctx, 0, pattern, 0).Iterator()
	for iter.Next(ctx) {
		key := iter.Val()

		model, _, ok := getModelChannelID(key)
		if !ok {
			continue
		}

		rate, err := getErrorRateScript.Run(
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

func GetModelChannelErrorRate(ctx context.Context, model string) (map[int64]float64, error) {
	if !common.RedisEnabled {
		return memModelMonitor.GetModelChannelErrorRate(ctx, model)
	}

	result := make(map[int64]float64)
	pattern := buildStatsKey(model, "*")
	now := time.Now().UnixMilli()

	iter := common.RDB.Scan(ctx, 0, pattern, 0).Iterator()
	for iter.Next(ctx) {
		key := iter.Val()

		_, channelID, ok := getModelChannelID(key)
		if !ok {
			continue
		}

		rate, err := getErrorRateScript.Run(
			ctx,
			common.RDB,
			[]string{key},
			now,
		).Float64()
		if err != nil {
			return nil, err
		}

		result[channelID] = rate
	}

	if err := iter.Err(); err != nil {
		return nil, err
	}

	return result, nil
}

// GetBannedChannelsWithModel gets banned channels for a specific model
func GetBannedChannelsWithModel(ctx context.Context, model string) ([]int64, error) {
	if !config.GetEnableModelErrorAutoBan() {
		return []int64{}, nil
	}

	if !common.RedisEnabled {
		return memModelMonitor.GetBannedChannelsWithModel(ctx, model)
	}

	result := []int64{}
	prefix := modelKeyPrefix + model + channelKeyPart
	pattern := prefix + "*" + bannedKeySuffix
	iter := common.RDB.Scan(ctx, 0, pattern, 0).Iterator()

	for iter.Next(ctx) {
		key := iter.Val()
		channelIDStr := strings.TrimSuffix(strings.TrimPrefix(key, prefix), bannedKeySuffix)

		channelID, err := strconv.ParseInt(channelIDStr, 10, 64)
		if err != nil {
			continue
		}

		result = append(result, channelID)
	}

	if err := iter.Err(); err != nil {
		return nil, err
	}

	return result, nil
}

// ClearChannelModelErrors clears errors for a specific channel and model
func ClearChannelModelErrors(ctx context.Context, model string, channelID int) error {
	if !common.RedisEnabled {
		return memModelMonitor.ClearChannelModelErrors(ctx, model, channelID)
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
		return memModelMonitor.ClearChannelAllModelErrors(ctx, channelID)
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
		return memModelMonitor.ClearAllModelErrors(ctx)
	}
	return clearAllModelErrorsScript.Run(ctx, common.RDB, []string{}).Err()
}

// GetAllBannedModelChannels gets all banned channels for all models
func GetAllBannedModelChannels(ctx context.Context) (map[string][]int64, error) {
	if !config.GetEnableModelErrorAutoBan() {
		return map[string][]int64{}, nil
	}

	if !common.RedisEnabled {
		return memModelMonitor.GetAllBannedModelChannels(ctx)
	}

	result := make(map[string][]int64)
	pattern := modelKeyPrefix + "*" + channelKeyPart + "*" + bannedKeySuffix
	iter := common.RDB.Scan(ctx, 0, pattern, 0).Iterator()

	for iter.Next(ctx) {
		key := iter.Val()
		parts := strings.TrimPrefix(key, modelKeyPrefix)
		parts = strings.TrimSuffix(parts, bannedKeySuffix)

		model, channelIDStr, ok := strings.Cut(parts, channelKeyPart)
		if !ok {
			continue
		}

		channelID, err := strconv.ParseInt(channelIDStr, 10, 64)
		if err != nil {
			continue
		}

		if _, exists := result[model]; !exists {
			result[model] = []int64{}
		}
		result[model] = append(result[model], channelID)
	}

	if err := iter.Err(); err != nil {
		return nil, err
	}

	return result, nil
}

// GetAllChannelModelErrorRates gets error rates for all channels and models
func GetAllChannelModelErrorRates(ctx context.Context) (map[int64]map[string]float64, error) {
	if !common.RedisEnabled {
		return memModelMonitor.GetAllChannelModelErrorRates(ctx)
	}

	result := make(map[int64]map[string]float64)
	pattern := buildStatsKey("*", "*")
	now := time.Now().UnixMilli()

	iter := common.RDB.Scan(ctx, 0, pattern, 0).Iterator()
	for iter.Next(ctx) {
		key := iter.Val()

		model, channelID, ok := getModelChannelID(key)
		if !ok {
			continue
		}

		rate, err := getErrorRateScript.Run(
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
local can_ban = tonumber(ARGV[5])
local try_ban = tonumber(ARGV[6])

local banned_key = "model:" .. model .. ":channel:" .. channel_id .. ":banned"
local stats_key = "model:" .. model .. ":channel:" .. channel_id .. ":stats"
local model_stats_key = "model:" .. model .. ":total_stats"
local maxSliceCount = 12
local statsExpiry = maxSliceCount * 10 * 1000
local banExpiry = 5 * 60 * 1000
local current_slice = math.floor(now_ts / 10 / 1000)

local function parse_req_err(value)
    if not value then return 0, 0 end
    local r, e = value:match("^(%d+):(%d+)$")
    return tonumber(r) or 0, tonumber(e) or 0
end

local function update_stats(key)
    local req, err = parse_req_err(redis.call("HGET", key, current_slice))
    req = req + 1
    err = err + (is_error == 1 and 1 or 0)
    redis.call("HSET", key, current_slice, req .. ":" .. err)
    redis.call("PEXPIRE", key, statsExpiry)
    return req, err
end

local function get_clean_req_err(key)
	local total_req, total_err = 0, 0
	local min_valid_slice = current_slice - maxSliceCount
    local all_slices = redis.call("HGETALL", key)
    for i = 1, #all_slices, 2 do
        local slice = tonumber(all_slices[i])
        if slice < min_valid_slice then
            redis.call("HDEL", key, all_slices[i])
		else
			local req, err = parse_req_err(all_slices[i+1])
			total_req = total_req + req
			total_err = total_err + err
		end
    end
	return total_req, total_err
end

update_stats(stats_key)
update_stats(model_stats_key)

local function check_channel_error()
    local already_banned = redis.call("EXISTS", banned_key) == 1

	if try_ban == 1 and can_ban == 1 then
		if already_banned then
			return 2
		end
		redis.call("SET", banned_key, 1)
		redis.call("PEXPIRE", banned_key, banExpiry)
		return 1
	end

	local total_req, total_err = get_clean_req_err(stats_key)
	if total_req < 20 then
		return 0
	end

	if (total_err / total_req) < max_error_rate then
		return 0
	else
		if can_ban == 0 or already_banned then
			return 3
		end
		redis.call("SET", banned_key, 1)
		redis.call("PEXPIRE", banned_key, banExpiry)
		return 1
	end
end

return check_channel_error()
`

	getErrorRateLuaScript = `
local stats_key = KEYS[1]
local now_ts = tonumber(ARGV[1])
local maxSliceCount = 12
local current_slice = math.floor(now_ts / 10 / 1000)

local function parse_req_err(value)
    if not value then return 0, 0 end
    local r, e = value:match("^(%d+):(%d+)$")
    return tonumber(r) or 0, tonumber(e) or 0
end

local function get_clean_req_err(key)
	local total_req, total_err = 0, 0
	local min_valid_slice = current_slice - maxSliceCount
    local all_slices = redis.call("HGETALL", key)
    for i = 1, #all_slices, 2 do
        local slice = tonumber(all_slices[i])
        if slice < min_valid_slice then
            redis.call("HDEL", key, all_slices[i])
		else
			local req, err = parse_req_err(all_slices[i+1])
			total_req = total_req + req
			total_err = total_err + err
		end
    end
	return total_req, total_err
end

local total_req, total_err = get_clean_req_err(stats_key)
if total_req < 20 then return 0 end
return string.format("%.2f", total_err / total_req)
`

	clearChannelModelErrorsLuaScript = `
local model = KEYS[1]
local channel_id = ARGV[1]
local stats_key = "model:" .. model .. ":channel:" .. channel_id .. ":stats"
local banned_key = "model:" .. model .. ":channel:" .. channel_id .. ":banned"

redis.call("DEL", stats_key)
redis.call("DEL", banned_key)
return redis.status_reply("ok")
`

	clearChannelAllModelErrorsLuaScript = `
local function del_keys(pattern)
    local keys = redis.call("KEYS", pattern)
    if #keys > 0 then redis.call("DEL", unpack(keys)) end
end

local channel_id = ARGV[1]
local stats_pattern = "model:*:channel:" .. channel_id .. ":stats"
local banned_pattern = "model:*:channel:" .. channel_id .. ":banned"

del_keys(stats_pattern)
del_keys(banned_pattern)

return redis.status_reply("ok")
`

	clearAllModelErrorsLuaScript = `
local function del_keys(pattern)
    local keys = redis.call("KEYS", pattern)
    if #keys > 0 then redis.call("DEL", unpack(keys)) end
end

del_keys("model:*:channel:*:stats")
del_keys("model:*:channel:*:banned")

return redis.status_reply("ok")
`
)
