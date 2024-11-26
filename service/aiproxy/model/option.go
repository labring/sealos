package model

import (
	"errors"
	"fmt"
	"slices"
	"strconv"
	"time"

	json "github.com/json-iterator/go"

	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/common/conv"
	"github.com/labring/sealos/service/aiproxy/common/logger"
)

type Option struct {
	Key   string `gorm:"primaryKey" json:"key"`
	Value string `json:"value"`
}

func AllOption() ([]*Option, error) {
	var options []*Option
	err := DB.Find(&options).Error
	return options, err
}

func InitOptionMap() error {
	config.OptionMapRWMutex.Lock()
	config.OptionMap = make(map[string]string)
	config.OptionMap["DisableServe"] = strconv.FormatBool(config.GetDisableServe())
	config.OptionMap["AutomaticDisableChannelEnabled"] = strconv.FormatBool(config.GetAutomaticDisableChannelEnabled())
	config.OptionMap["AutomaticEnableChannelWhenTestSucceedEnabled"] = strconv.FormatBool(config.GetAutomaticEnableChannelWhenTestSucceedEnabled())
	config.OptionMap["ApproximateTokenEnabled"] = strconv.FormatBool(config.GetApproximateTokenEnabled())
	config.OptionMap["BillingEnabled"] = strconv.FormatBool(config.GetBillingEnabled())
	config.OptionMap["RetryTimes"] = strconv.FormatInt(config.GetRetryTimes(), 10)
	config.OptionMap["GlobalApiRateLimitNum"] = strconv.FormatInt(config.GetGlobalAPIRateLimitNum(), 10)
	config.OptionMap["DefaultGroupQPM"] = strconv.FormatInt(config.GetDefaultGroupQPM(), 10)
	defaultChannelModelsJSON, _ := json.Marshal(config.GetDefaultChannelModels())
	config.OptionMap["DefaultChannelModels"] = conv.BytesToString(defaultChannelModelsJSON)
	defaultChannelModelMappingJSON, _ := json.Marshal(config.GetDefaultChannelModelMapping())
	config.OptionMap["DefaultChannelModelMapping"] = conv.BytesToString(defaultChannelModelMappingJSON)
	config.OptionMap["GeminiSafetySetting"] = config.GetGeminiSafetySetting()
	config.OptionMap["GeminiVersion"] = config.GetGeminiVersion()
	config.OptionMap["GroupMaxTokenNum"] = strconv.FormatInt(int64(config.GetGroupMaxTokenNum()), 10)
	config.OptionMapRWMutex.Unlock()
	return loadOptionsFromDatabase(true)
}

func loadOptionsFromDatabase(isInit bool) error {
	logger.SysDebug("syncing options from database")
	options, err := AllOption()
	if err != nil {
		return err
	}
	for _, option := range options {
		err := updateOptionMap(option.Key, option.Value, isInit)
		if err != nil && !errors.Is(err, ErrUnknownOptionKey) {
			logger.SysErrorf("failed to update option: %s, value: %s, error: %s", option.Key, option.Value, err.Error())
		}
	}
	logger.SysDebug("options synced from database")
	return nil
}

func SyncOptions(frequency time.Duration) {
	ticker := time.NewTicker(frequency)
	defer ticker.Stop()
	for range ticker.C {
		if err := loadOptionsFromDatabase(true); err != nil {
			logger.SysErrorf("failed to sync options from database: %s", err.Error())
		}
	}
}

func UpdateOption(key string, value string) error {
	err := updateOptionMap(key, value, false)
	if err != nil {
		return err
	}
	// Save to database first
	option := Option{
		Key: key,
	}
	err = DB.Assign(Option{Key: key, Value: value}).FirstOrCreate(&option).Error
	if err != nil {
		return err
	}
	return nil
}

func UpdateOptions(options map[string]string) error {
	errs := make([]error, 0)
	for key, value := range options {
		err := UpdateOption(key, value)
		if err != nil && !errors.Is(err, ErrUnknownOptionKey) {
			errs = append(errs, err)
		}
	}
	if len(errs) > 0 {
		return errors.Join(errs...)
	}
	return nil
}

var ErrUnknownOptionKey = errors.New("unknown option key")

func isTrue(value string) bool {
	result, _ := strconv.ParseBool(value)
	return result
}

func updateOptionMap(key string, value string, isInit bool) (err error) {
	config.OptionMapRWMutex.Lock()
	defer config.OptionMapRWMutex.Unlock()
	config.OptionMap[key] = value
	switch key {
	case "DisableServe":
		config.SetDisableServe(isTrue(value))
	case "AutomaticDisableChannelEnabled":
		config.SetAutomaticDisableChannelEnabled(isTrue(value))
	case "AutomaticEnableChannelWhenTestSucceedEnabled":
		config.SetAutomaticEnableChannelWhenTestSucceedEnabled(isTrue(value))
	case "ApproximateTokenEnabled":
		config.SetApproximateTokenEnabled(isTrue(value))
	case "BillingEnabled":
		config.SetBillingEnabled(isTrue(value))
	case "GroupMaxTokenNum":
		groupMaxTokenNum, err := strconv.ParseInt(value, 10, 32)
		if err != nil {
			return err
		}
		config.SetGroupMaxTokenNum(int32(groupMaxTokenNum))
	case "GeminiSafetySetting":
		config.SetGeminiSafetySetting(value)
	case "GeminiVersion":
		config.SetGeminiVersion(value)
	case "GlobalApiRateLimitNum":
		globalAPIRateLimitNum, err := strconv.ParseInt(value, 10, 64)
		if err != nil {
			return err
		}
		config.SetGlobalAPIRateLimitNum(globalAPIRateLimitNum)
	case "DefaultGroupQPM":
		defaultGroupQPM, err := strconv.ParseInt(value, 10, 64)
		if err != nil {
			return err
		}
		config.SetDefaultGroupQPM(defaultGroupQPM)
	case "DefaultChannelModels":
		var newModels map[int][]string
		err := json.Unmarshal(conv.StringToBytes(value), &newModels)
		if err != nil {
			return err
		}
		// check model config exist
		allModelsMap := make(map[string]struct{})
		for _, models := range newModels {
			for _, model := range models {
				allModelsMap[model] = struct{}{}
			}
		}
		allModels := make([]string, 0, len(allModelsMap))
		for model := range allModelsMap {
			allModels = append(allModels, model)
		}
		foundModels, missingModels := CacheCheckModelConfig(allModels)
		if !isInit && len(missingModels) > 0 {
			return fmt.Errorf("model config not found: %v", missingModels)
		}
		if len(missingModels) > 0 {
			logger.SysErrorf("model config not found: %v", missingModels)
		}
		allowedNewModels := make(map[int][]string)
		for t, ms := range newModels {
			for _, m := range ms {
				if slices.Contains(foundModels, m) {
					allowedNewModels[t] = append(allowedNewModels[t], m)
				}
			}
		}
		config.SetDefaultChannelModels(allowedNewModels)
	case "DefaultChannelModelMapping":
		var newMapping map[int]map[string]string
		err := json.Unmarshal(conv.StringToBytes(value), &newMapping)
		if err != nil {
			return err
		}
		config.SetDefaultChannelModelMapping(newMapping)
	case "RetryTimes":
		retryTimes, err := strconv.ParseInt(value, 10, 32)
		if err != nil {
			return err
		}
		config.SetRetryTimes(retryTimes)
	default:
		return ErrUnknownOptionKey
	}
	return err
}
