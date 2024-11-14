package price

import (
	"fmt"
	"sync"
	"sync/atomic"

	json "github.com/json-iterator/go"

	"github.com/labring/sealos/service/aiproxy/common/conv"
	"github.com/labring/sealos/service/aiproxy/common/logger"
)

const (
	// /1K tokens
	PriceUnit = 1000
)

// ModelPrice
// https://platform.openai.com/docs/models/model-endpoint-compatibility
// https://cloud.baidu.com/doc/WENXINWORKSHOP/s/Blfmc9dlf
// https://openai.com/pricing
// 价格单位：人民币/1K tokens
var (
	modelPrice        = map[string]float64{}
	completionPrice   = map[string]float64{}
	modelPriceMu      sync.RWMutex
	completionPriceMu sync.RWMutex
)

var (
	DefaultModelPrice      map[string]float64
	DefaultCompletionPrice map[string]float64
)

func init() {
	DefaultModelPrice = make(map[string]float64)
	modelPriceMu.RLock()
	for k, v := range modelPrice {
		DefaultModelPrice[k] = v
	}
	modelPriceMu.RUnlock()

	DefaultCompletionPrice = make(map[string]float64)
	completionPriceMu.RLock()
	for k, v := range completionPrice {
		DefaultCompletionPrice[k] = v
	}
	completionPriceMu.RUnlock()
}

func AddNewMissingPrice(oldPrice string) string {
	newPrice := make(map[string]float64)
	err := json.Unmarshal(conv.StringToBytes(oldPrice), &newPrice)
	if err != nil {
		logger.SysError("error unmarshalling old price: " + err.Error())
		return oldPrice
	}
	for k, v := range DefaultModelPrice {
		if _, ok := newPrice[k]; !ok {
			newPrice[k] = v
		}
	}
	jsonBytes, err := json.Marshal(newPrice)
	if err != nil {
		logger.SysError("error marshalling new price: " + err.Error())
		return oldPrice
	}
	return conv.BytesToString(jsonBytes)
}

func ModelPrice2JSONString() string {
	modelPriceMu.RLock()
	jsonBytes, err := json.Marshal(modelPrice)
	modelPriceMu.RUnlock()
	if err != nil {
		logger.SysError("error marshalling model price: " + err.Error())
	}
	return conv.BytesToString(jsonBytes)
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

func UpdateModelPriceByJSONString(jsonStr string) error {
	newModelPrice := make(map[string]float64)
	err := json.Unmarshal(conv.StringToBytes(jsonStr), &newModelPrice)
	if err != nil {
		logger.SysError("error unmarshalling model price: " + err.Error())
		return err
	}
	modelPriceMu.Lock()
	modelPrice = newModelPrice
	modelPriceMu.Unlock()
	return nil
}

func GetModelPrice(mapedName string, reqModel string, channelType int) (float64, bool) {
	if !GetBillingEnabled() {
		return 0, true
	}
	price, ok := getModelPrice(mapedName, channelType)
	if !ok && reqModel != "" {
		price, ok = getModelPrice(reqModel, channelType)
	}
	return price, ok
}

func getModelPrice(modelName string, channelType int) (float64, bool) {
	model := fmt.Sprintf("%s(%d)", modelName, channelType)
	modelPriceMu.RLock()
	defer modelPriceMu.RUnlock()
	price, ok := modelPrice[model]
	if ok {
		return price, true
	}
	if price, ok := DefaultModelPrice[model]; ok {
		return price, true
	}
	price, ok = modelPrice[modelName]
	if ok {
		return price, true
	}
	if price, ok := DefaultModelPrice[modelName]; ok {
		return price, true
	}
	return 0, false
}

func CompletionPrice2JSONString() string {
	completionPriceMu.RLock()
	jsonBytes, err := json.Marshal(completionPrice)
	completionPriceMu.RUnlock()
	if err != nil {
		logger.SysError("error marshalling completion price: " + err.Error())
	}
	return conv.BytesToString(jsonBytes)
}

func UpdateCompletionPriceByJSONString(jsonStr string) error {
	newCompletionPrice := make(map[string]float64)
	err := json.Unmarshal(conv.StringToBytes(jsonStr), &newCompletionPrice)
	if err != nil {
		logger.SysError("error unmarshalling completion price: " + err.Error())
		return err
	}
	completionPriceMu.Lock()
	completionPrice = newCompletionPrice
	completionPriceMu.Unlock()
	return nil
}

func GetCompletionPrice(name string, reqModel string, channelType int) (float64, bool) {
	if !GetBillingEnabled() {
		return 0, true
	}
	price, ok := getCompletionPrice(name, channelType)
	if !ok && reqModel != "" {
		price, ok = getCompletionPrice(reqModel, channelType)
	}
	return price, ok
}

func getCompletionPrice(name string, channelType int) (float64, bool) {
	model := fmt.Sprintf("%s(%d)", name, channelType)
	completionPriceMu.RLock()
	defer completionPriceMu.RUnlock()
	price, ok := completionPrice[model]
	if ok {
		return price, true
	}
	if price, ok := DefaultCompletionPrice[model]; ok {
		return price, true
	}
	price, ok = completionPrice[name]
	if ok {
		return price, true
	}
	if price, ok := DefaultCompletionPrice[name]; ok {
		return price, true
	}
	return getModelPrice(name, channelType)
}

func GetModelPriceMap() map[string]float64 {
	modelPriceMu.RLock()
	defer modelPriceMu.RUnlock()
	return modelPrice
}

func GetCompletionPriceMap() map[string]float64 {
	completionPriceMu.RLock()
	defer completionPriceMu.RUnlock()
	return completionPrice
}
