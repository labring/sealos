package config

import (
	"math"
	"os"
	"slices"
	"sync/atomic"

	"github.com/labring/sealos/service/aiproxy/common/env"
)

var (
	DebugEnabled    = env.Bool("DEBUG", false)
	DebugSQLEnabled = env.Bool("DEBUG_SQL", false)
)

var (
	DisableAutoMigrateDB = env.Bool("DISABLE_AUTO_MIGRATE_DB", false)
	OnlyOneLogFile       = env.Bool("ONLY_ONE_LOG_FILE", false)
	AdminKey             = os.Getenv("ADMIN_KEY")
	FfprobeEnabled       = env.Bool("FFPROBE_ENABLED", false)
)

var (
	disableServe                 atomic.Bool
	saveAllLogDetail             atomic.Bool
	logDetailRequestBodyMaxSize  int64 = 128 * 1024 // 128KB
	logDetailResponseBodyMaxSize int64 = 128 * 1024 // 128KB
	logDetailStorageHours        int64 = 3 * 24
	internalToken                atomic.Value
)

var (
	retryTimes              atomic.Int64
	enableModelErrorAutoBan atomic.Bool
	modelErrorAutoBanRate   = math.Float64bits(0.5)
	timeoutWithModelType    atomic.Value
	disableModelConfig      = env.Bool("DISABLE_MODEL_CONFIG", false)
)

var (
	defaultChannelModels       atomic.Value
	defaultChannelModelMapping atomic.Value
	groupMaxTokenNum           atomic.Int64
	groupConsumeLevelRatio     atomic.Value
)

var geminiSafetySetting atomic.Value

var billingEnabled atomic.Bool

func init() {
	timeoutWithModelType.Store(make(map[int]int64))
	defaultChannelModels.Store(make(map[int][]string))
	defaultChannelModelMapping.Store(make(map[int]map[string]string))
	groupConsumeLevelRatio.Store(make(map[float64]float64))
	geminiSafetySetting.Store("BLOCK_NONE")
	billingEnabled.Store(true)
	internalToken.Store(os.Getenv("INTERNAL_TOKEN"))
}

func GetDisableModelConfig() bool {
	return disableModelConfig
}

func GetRetryTimes() int64 {
	return retryTimes.Load()
}

func SetRetryTimes(times int64) {
	times = env.Int64("RETRY_TIMES", times)
	retryTimes.Store(times)
}

func GetEnableModelErrorAutoBan() bool {
	return enableModelErrorAutoBan.Load()
}

func SetEnableModelErrorAutoBan(enabled bool) {
	enabled = env.Bool("ENABLE_MODEL_ERROR_AUTO_BAN", enabled)
	enableModelErrorAutoBan.Store(enabled)
}

func GetModelErrorAutoBanRate() float64 {
	return math.Float64frombits(atomic.LoadUint64(&modelErrorAutoBanRate))
}

func SetModelErrorAutoBanRate(rate float64) {
	rate = env.Float64("MODEL_ERROR_AUTO_BAN_RATE", rate)
	atomic.StoreUint64(&modelErrorAutoBanRate, math.Float64bits(rate))
}

func GetTimeoutWithModelType() map[int]int64 {
	return timeoutWithModelType.Load().(map[int]int64)
}

func SetTimeoutWithModelType(timeout map[int]int64) {
	timeout = env.JSON("TIMEOUT_WITH_MODEL_TYPE", timeout)
	timeoutWithModelType.Store(timeout)
}

func GetLogDetailStorageHours() int64 {
	return atomic.LoadInt64(&logDetailStorageHours)
}

func SetLogDetailStorageHours(hours int64) {
	hours = env.Int64("LOG_DETAIL_STORAGE_HOURS", hours)
	atomic.StoreInt64(&logDetailStorageHours, hours)
}

func GetSaveAllLogDetail() bool {
	return saveAllLogDetail.Load()
}

func SetSaveAllLogDetail(enabled bool) {
	enabled = env.Bool("SAVE_ALL_LOG_DETAIL", enabled)
	saveAllLogDetail.Store(enabled)
}

func GetLogDetailRequestBodyMaxSize() int64 {
	return atomic.LoadInt64(&logDetailRequestBodyMaxSize)
}

func SetLogDetailRequestBodyMaxSize(size int64) {
	size = env.Int64("LOG_DETAIL_REQUEST_BODY_MAX_SIZE", size)
	atomic.StoreInt64(&logDetailRequestBodyMaxSize, size)
}

func GetLogDetailResponseBodyMaxSize() int64 {
	return atomic.LoadInt64(&logDetailResponseBodyMaxSize)
}

func SetLogDetailResponseBodyMaxSize(size int64) {
	size = env.Int64("LOG_DETAIL_RESPONSE_BODY_MAX_SIZE", size)
	atomic.StoreInt64(&logDetailResponseBodyMaxSize, size)
}

func GetDisableServe() bool {
	return disableServe.Load()
}

func SetDisableServe(disabled bool) {
	disabled = env.Bool("DISABLE_SERVE", disabled)
	disableServe.Store(disabled)
}

func GetDefaultChannelModels() map[int][]string {
	return defaultChannelModels.Load().(map[int][]string)
}

func SetDefaultChannelModels(models map[int][]string) {
	models = env.JSON("DEFAULT_CHANNEL_MODELS", models)
	for key, ms := range models {
		slices.Sort(ms)
		models[key] = slices.Compact(ms)
	}
	defaultChannelModels.Store(models)
}

func GetDefaultChannelModelMapping() map[int]map[string]string {
	return defaultChannelModelMapping.Load().(map[int]map[string]string)
}

func SetDefaultChannelModelMapping(mapping map[int]map[string]string) {
	mapping = env.JSON("DEFAULT_CHANNEL_MODEL_MAPPING", mapping)
	defaultChannelModelMapping.Store(mapping)
}

func GetGroupConsumeLevelRatio() map[float64]float64 {
	return groupConsumeLevelRatio.Load().(map[float64]float64)
}

func SetGroupConsumeLevelRatio(ratio map[float64]float64) {
	ratio = env.JSON("GROUP_CONSUME_LEVEL_RATIO", ratio)
	groupConsumeLevelRatio.Store(ratio)
}

// GetGroupMaxTokenNum returns max number of tokens per group, 0 means unlimited
func GetGroupMaxTokenNum() int64 {
	return groupMaxTokenNum.Load()
}

func SetGroupMaxTokenNum(num int64) {
	num = env.Int64("GROUP_MAX_TOKEN_NUM", num)
	groupMaxTokenNum.Store(num)
}

func GetGeminiSafetySetting() string {
	return geminiSafetySetting.Load().(string)
}

func SetGeminiSafetySetting(setting string) {
	setting = env.String("GEMINI_SAFETY_SETTING", setting)
	geminiSafetySetting.Store(setting)
}

func GetBillingEnabled() bool {
	return billingEnabled.Load()
}

func SetBillingEnabled(enabled bool) {
	enabled = env.Bool("BILLING_ENABLED", enabled)
	billingEnabled.Store(enabled)
}

func GetInternalToken() string {
	return internalToken.Load().(string)
}

func SetInternalToken(token string) {
	token = env.String("INTERNAL_TOKEN", token)
	internalToken.Store(token)
}
