package config

import (
	"math"
	"os"
	"slices"
	"strconv"
	"sync/atomic"
	"time"

	"github.com/labring/sealos/service/aiproxy/common/env"
)

var (
	DebugEnabled, _    = strconv.ParseBool(os.Getenv("DEBUG"))
	DebugSQLEnabled, _ = strconv.ParseBool(os.Getenv("DEBUG_SQL"))
)

var (
	// 暂停服务
	disableServe atomic.Bool
	// log detail 存储时间(小时)
	logDetailStorageHours int64 = 3 * 24
)

var (
	// 重试次数
	retryTimes atomic.Int64
	// 是否开启模型错误率自动封禁
	enableModelErrorAutoBan atomic.Bool
	// 模型错误率自动封禁
	modelErrorAutoBanRate = math.Float64bits(0.5)
	// 模型类型超时时间，单位秒
	timeoutWithModelType atomic.Value

	disableModelConfig atomic.Bool
)

func GetDisableModelConfig() bool {
	return disableModelConfig.Load()
}

func SetDisableModelConfig(disabled bool) {
	disableModelConfig.Store(disabled)
}

func GetRetryTimes() int64 {
	return retryTimes.Load()
}

func GetEnableModelErrorAutoBan() bool {
	return enableModelErrorAutoBan.Load()
}

func SetEnableModelErrorAutoBan(enabled bool) {
	enableModelErrorAutoBan.Store(enabled)
}

func GetModelErrorAutoBanRate() float64 {
	return math.Float64frombits(atomic.LoadUint64(&modelErrorAutoBanRate))
}

func SetModelErrorAutoBanRate(rate float64) {
	atomic.StoreUint64(&modelErrorAutoBanRate, math.Float64bits(rate))
}

func SetRetryTimes(times int64) {
	retryTimes.Store(times)
}

func init() {
	timeoutWithModelType.Store(make(map[int]int64))
}

func GetTimeoutWithModelType() map[int]int64 {
	return timeoutWithModelType.Load().(map[int]int64)
}

func SetTimeoutWithModelType(timeout map[int]int64) {
	timeoutWithModelType.Store(timeout)
}

func GetLogDetailStorageHours() int64 {
	return atomic.LoadInt64(&logDetailStorageHours)
}

func SetLogDetailStorageHours(hours int64) {
	atomic.StoreInt64(&logDetailStorageHours, hours)
}

func GetDisableServe() bool {
	return disableServe.Load()
}

func SetDisableServe(disabled bool) {
	disableServe.Store(disabled)
}

var DisableAutoMigrateDB = os.Getenv("DISABLE_AUTO_MIGRATE_DB") == "true"

var RateLimitKeyExpirationDuration = 20 * time.Minute

var OnlyOneLogFile = env.Bool("ONLY_ONE_LOG_FILE", false)

var AdminKey = env.String("ADMIN_KEY", "")

var (
	defaultChannelModels       atomic.Value
	defaultChannelModelMapping atomic.Value
	groupMaxTokenNum           atomic.Int32
	// group消费金额对应的rpm/tpm乘数，使用map[float64]float64
	groupConsumeLevelRatio atomic.Value
)

func init() {
	defaultChannelModels.Store(make(map[int][]string))
	defaultChannelModelMapping.Store(make(map[int]map[string]string))
	groupConsumeLevelRatio.Store(make(map[float64]float64))
}

func GetDefaultChannelModels() map[int][]string {
	return defaultChannelModels.Load().(map[int][]string)
}

func SetDefaultChannelModels(models map[int][]string) {
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
	defaultChannelModelMapping.Store(mapping)
}

func GetGroupConsumeLevelRatio() map[float64]float64 {
	return groupConsumeLevelRatio.Load().(map[float64]float64)
}

func SetGroupConsumeLevelRatio(ratio map[float64]float64) {
	groupConsumeLevelRatio.Store(ratio)
}

// 那个group最多可创建的token数量，0表示不限制
func GetGroupMaxTokenNum() int32 {
	return groupMaxTokenNum.Load()
}

func SetGroupMaxTokenNum(num int32) {
	groupMaxTokenNum.Store(num)
}

var geminiSafetySetting atomic.Value

func init() {
	geminiSafetySetting.Store("BLOCK_NONE")
}

func GetGeminiSafetySetting() string {
	return geminiSafetySetting.Load().(string)
}

func SetGeminiSafetySetting(setting string) {
	geminiSafetySetting.Store(setting)
}

var billingEnabled atomic.Bool

func init() {
	billingEnabled.Store(true)
}

func GetBillingEnabled() bool {
	return billingEnabled.Load()
}

func SetBillingEnabled(enabled bool) {
	billingEnabled.Store(enabled)
}
