package config

import (
	"os"
	"slices"
	"strconv"
	"sync"
	"sync/atomic"
	"time"

	"github.com/labring/sealos/service/aiproxy/common/env"
)

var (
	OptionMap        map[string]string
	OptionMapRWMutex sync.RWMutex
)

var (
	DebugEnabled, _    = strconv.ParseBool(os.Getenv("DEBUG"))
	DebugSQLEnabled, _ = strconv.ParseBool(os.Getenv("DEBUG_SQL"))
)

var (
	// 当测试或请求的时候发生错误是否自动禁用渠道
	automaticDisableChannelEnabled atomic.Bool
	// 当测试成功是否自动启用渠道
	automaticEnableChannelWhenTestSucceedEnabled atomic.Bool
	// 是否近似计算token
	approximateTokenEnabled atomic.Bool
	// 重试次数
	retryTimes atomic.Int64
	// 暂停服务
	disableServe atomic.Bool
	// log detail 存储时间(小时)
	logDetailStorageHours int64 = 3 * 24
)

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

func GetAutomaticDisableChannelEnabled() bool {
	return automaticDisableChannelEnabled.Load()
}

func SetAutomaticDisableChannelEnabled(enabled bool) {
	automaticDisableChannelEnabled.Store(enabled)
}

func GetAutomaticEnableChannelWhenTestSucceedEnabled() bool {
	return automaticEnableChannelWhenTestSucceedEnabled.Load()
}

func SetAutomaticEnableChannelWhenTestSucceedEnabled(enabled bool) {
	automaticEnableChannelWhenTestSucceedEnabled.Store(enabled)
}

func GetApproximateTokenEnabled() bool {
	return approximateTokenEnabled.Load()
}

func SetApproximateTokenEnabled(enabled bool) {
	approximateTokenEnabled.Store(enabled)
}

func GetRetryTimes() int64 {
	return retryTimes.Load()
}

func SetRetryTimes(times int64) {
	retryTimes.Store(times)
}

var DisableAutoMigrateDB = os.Getenv("DISABLE_AUTO_MIGRATE_DB") == "true"

var RelayTimeout = env.Int("RELAY_TIMEOUT", 0) // unit is second

var RateLimitKeyExpirationDuration = 20 * time.Minute

var OnlyOneLogFile = env.Bool("ONLY_ONE_LOG_FILE", false)

var (
	// 代理地址
	RelayProxy = env.String("RELAY_PROXY", "")
	// 用户内容请求代理地址
	UserContentRequestProxy = env.String("USER_CONTENT_REQUEST_PROXY", "")
	// 用户内容请求超时时间，单位为秒
	UserContentRequestTimeout = env.Int("USER_CONTENT_REQUEST_TIMEOUT", 30)
)

var AdminKey = env.String("ADMIN_KEY", "")

var (
	globalAPIRateLimitNum      atomic.Int64
	defaultChannelModels       atomic.Value
	defaultChannelModelMapping atomic.Value
	defaultGroupQPM            atomic.Int64
	groupMaxTokenNum           atomic.Int32
)

func init() {
	defaultChannelModels.Store(make(map[int][]string))
	defaultChannelModelMapping.Store(make(map[int]map[string]string))
}

// 全局qpm，不是根据ip限制，而是所有请求共享一个qpm
func GetGlobalAPIRateLimitNum() int64 {
	return globalAPIRateLimitNum.Load()
}

func SetGlobalAPIRateLimitNum(num int64) {
	globalAPIRateLimitNum.Store(num)
}

// group默认qpm，如果group没有设置qpm，则使用该qpm
func GetDefaultGroupQPM() int64 {
	return defaultGroupQPM.Load()
}

func SetDefaultGroupQPM(qpm int64) {
	defaultGroupQPM.Store(qpm)
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

// 那个group最多可创建的token数量，0表示不限制
func GetGroupMaxTokenNum() int32 {
	return groupMaxTokenNum.Load()
}

func SetGroupMaxTokenNum(num int32) {
	groupMaxTokenNum.Store(num)
}

var (
	geminiSafetySetting atomic.Value
	geminiVersion       atomic.Value
)

func init() {
	geminiSafetySetting.Store("BLOCK_NONE")
	geminiVersion.Store("v1beta")
}

func GetGeminiSafetySetting() string {
	return geminiSafetySetting.Load().(string)
}

func SetGeminiSafetySetting(setting string) {
	geminiSafetySetting.Store(setting)
}

func GetGeminiVersion() string {
	return geminiVersion.Load().(string)
}

func SetGeminiVersion(version string) {
	geminiVersion.Store(version)
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
