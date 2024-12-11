package model

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"sort"
	"strconv"
	"sync"
	"time"

	json "github.com/json-iterator/go"

	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/common/conv"
	log "github.com/sirupsen/logrus"
)

type Option struct {
	Key   string `gorm:"primaryKey" json:"key"`
	Value string `json:"value"`
}

func GetAllOption() ([]*Option, error) {
	var options []*Option
	err := DB.Find(&options).Error
	return options, err
}

func InitOptionMap() error {
	config.OptionMapRWMutex.Lock()
	config.OptionMap = make(map[string]string)
	config.OptionMap["LogDetailStorageHours"] = strconv.FormatInt(config.GetLogDetailStorageHours(), 10)
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
	err := loadOptionsFromDatabase(true)
	if err != nil {
		return err
	}
	return storeOptionMap()
}

func storeOptionMap() error {
	config.OptionMapRWMutex.Lock()
	defer config.OptionMapRWMutex.Unlock()
	for key, value := range config.OptionMap {
		err := saveOption(key, value)
		if err != nil {
			return err
		}
	}
	return nil
}

func loadOptionsFromDatabase(isInit bool) error {
	options, err := GetAllOption()
	if err != nil {
		return err
	}
	for _, option := range options {
		err := updateOptionMap(option.Key, option.Value, isInit)
		if err != nil && !errors.Is(err, ErrUnknownOptionKey) {
			log.Errorf("failed to update option: %s, value: %s, error: %s", option.Key, option.Value, err.Error())
		}
	}
	return nil
}

func SyncOptions(ctx context.Context, wg *sync.WaitGroup, frequency time.Duration) {
	defer wg.Done()

	ticker := time.NewTicker(frequency)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := loadOptionsFromDatabase(true); err != nil {
				log.Error("failed to sync options from database: " + err.Error())
			}
		}
	}
}

func saveOption(key string, value string) error {
	option := Option{
		Key:   key,
		Value: value,
	}
	result := DB.Save(&option)
	return HandleUpdateResult(result, "option:"+key)
}

func UpdateOption(key string, value string) error {
	err := updateOptionMap(key, value, false)
	if err != nil {
		return err
	}
	return saveOption(key, value)
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
	case "LogDetailStorageHours":
		logDetailStorageHours, err := strconv.ParseInt(value, 10, 64)
		if err != nil {
			return err
		}
		config.SetLogDetailStorageHours(logDetailStorageHours)
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
		foundModels, missingModels, err := CheckModelConfig(allModels)
		if err != nil {
			return err
		}
		if !isInit && len(missingModels) > 0 {
			sort.Strings(missingModels)
			return fmt.Errorf("model config not found: %v", missingModels)
		}
		if len(missingModels) > 0 {
			sort.Strings(missingModels)
			log.Errorf("model config not found: %v", missingModels)
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
