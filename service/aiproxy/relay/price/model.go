package price

import (
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/model"
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

func GetModelPrice(mapedName string, reqModel string) (float64, float64, bool) {
	if !config.GetBillingEnabled() {
		return 0, 0, true
	}
	price, completionPrice, ok := getModelPrice(mapedName)
	if !ok && reqModel != "" {
		price, completionPrice, ok = getModelPrice(reqModel)
	}
	return price, completionPrice, ok
}

func getModelPrice(modelName string) (float64, float64, bool) {
	modelConfig, ok := model.CacheGetModelConfig(modelName)
	if !ok {
		return 0, 0, false
	}
	return modelConfig.InputPrice, modelConfig.OutputPrice, true
}
