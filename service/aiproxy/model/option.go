package model

import (
	"errors"
	"strconv"
	"time"

	json "github.com/json-iterator/go"

	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/common/conv"
	"github.com/labring/sealos/service/aiproxy/common/logger"
	billingprice "github.com/labring/sealos/service/aiproxy/relay/price"
)

type Option struct {
	Key   string `json:"key" gorm:"primaryKey"`
	Value string `json:"value"`
}

func AllOption() ([]*Option, error) {
	var options []*Option
	err := DB.Find(&options).Error
	return options, err
}

func InitOptionMap() {
	config.OptionMapRWMutex.Lock()
	config.OptionMap = make(map[string]string)
	config.OptionMap["DisableServe"] = strconv.FormatBool(config.GetDisableServe())
	config.OptionMap["AutomaticDisableChannelEnabled"] = strconv.FormatBool(config.GetAutomaticDisableChannelEnabled())
	config.OptionMap["AutomaticEnableChannelWhenTestSucceedEnabled"] = strconv.FormatBool(config.GetAutomaticEnableChannelWhenTestSucceedEnabled())
	config.OptionMap["ApproximateTokenEnabled"] = strconv.FormatBool(config.GetApproximateTokenEnabled())
	config.OptionMap["BillingEnabled"] = strconv.FormatBool(billingprice.GetBillingEnabled())
	config.OptionMap["ModelPrice"] = billingprice.ModelPrice2JSONString()
	config.OptionMap["CompletionPrice"] = billingprice.CompletionPrice2JSONString()
	config.OptionMap["RetryTimes"] = strconv.FormatInt(config.GetRetryTimes(), 10)
	config.OptionMap["GlobalApiRateLimitNum"] = strconv.FormatInt(config.GetGlobalApiRateLimitNum(), 10)
	config.OptionMap["DefaultGroupQPM"] = strconv.FormatInt(config.GetDefaultGroupQPM(), 10)
	defaultChannelModelsJSON, _ := json.Marshal(config.GetDefaultChannelModels())
	config.OptionMap["DefaultChannelModels"] = conv.BytesToString(defaultChannelModelsJSON)
	defaultChannelModelMappingJSON, _ := json.Marshal(config.GetDefaultChannelModelMapping())
	config.OptionMap["DefaultChannelModelMapping"] = conv.BytesToString(defaultChannelModelMappingJSON)
	config.OptionMap["GeminiSafetySetting"] = config.GetGeminiSafetySetting()
	config.OptionMap["GeminiVersion"] = config.GetGeminiVersion()
	config.OptionMap["GroupMaxTokenNum"] = strconv.FormatInt(int64(config.GetGroupMaxTokenNum()), 10)
	config.OptionMapRWMutex.Unlock()
	loadOptionsFromDatabase()
}

func loadOptionsFromDatabase() {
	options, _ := AllOption()
	for _, option := range options {
		if option.Key == "ModelPrice" {
			option.Value = billingprice.AddNewMissingPrice(option.Value)
		}
		err := updateOptionMap(option.Key, option.Value)
		if err != nil {
			logger.SysError("failed to update option map: " + err.Error())
		}
	}
	logger.SysDebug("options synced from database")
}

func SyncOptions(frequency time.Duration) {
	ticker := time.NewTicker(frequency)
	defer ticker.Stop()
	for range ticker.C {
		logger.SysDebug("syncing options from database")
		loadOptionsFromDatabase()
	}
}

func UpdateOption(key string, value string) error {
	err := updateOptionMap(key, value)
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
		if err != nil && err != ErrUnknownOptionKey {
			errs = append(errs, err)
		}
	}
	if len(errs) > 0 {
		return errors.Join(errs...)
	}
	return nil
}

var ErrUnknownOptionKey = errors.New("unknown option key")

func updateOptionMap(key string, value string) (err error) {
	config.OptionMapRWMutex.Lock()
	defer config.OptionMapRWMutex.Unlock()
	config.OptionMap[key] = value
	switch key {
	case "DisableServe":
		config.SetDisableServe(value == "true")
	case "AutomaticDisableChannelEnabled":
		config.SetAutomaticDisableChannelEnabled(value == "true")
	case "AutomaticEnableChannelWhenTestSucceedEnabled":
		config.SetAutomaticEnableChannelWhenTestSucceedEnabled(value == "true")
	case "ApproximateTokenEnabled":
		config.SetApproximateTokenEnabled(value == "true")
	case "BillingEnabled":
		billingprice.SetBillingEnabled(value == "true")
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
		globalApiRateLimitNum, err := strconv.ParseInt(value, 10, 64)
		if err != nil {
			return err
		}
		config.SetGlobalApiRateLimitNum(globalApiRateLimitNum)
	case "DefaultGroupQPM":
		defaultGroupQPM, err := strconv.ParseInt(value, 10, 64)
		if err != nil {
			return err
		}
		config.SetDefaultGroupQPM(defaultGroupQPM)
	case "DefaultChannelModels":
		var newModules map[int][]string
		err := json.Unmarshal(conv.StringToBytes(value), &newModules)
		if err != nil {
			return err
		}
		config.SetDefaultChannelModels(newModules)
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
	case "ModelPrice":
		err = billingprice.UpdateModelPriceByJSONString(value)
	case "CompletionPrice":
		err = billingprice.UpdateCompletionPriceByJSONString(value)
	default:
		return ErrUnknownOptionKey
	}
	return err
}
