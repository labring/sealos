package price

import (
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/model"
)

func GetImageSizePrice(model string, reqModel string, size string) (float64, bool) {
	if !config.GetBillingEnabled() {
		return 0, false
	}
	if price, ok := getImageSizePrice(model, size); ok {
		return price, true
	}
	if price, ok := getImageSizePrice(reqModel, size); ok {
		return price, true
	}
	return 0, false
}

func getImageSizePrice(modelName string, size string) (float64, bool) {
	modelConfig, ok := model.CacheGetModelConfig(modelName)
	if !ok {
		return 0, false
	}
	price, ok := modelConfig.ImagePrices[size]
	return price, ok
}

func ValidateImageMaxBatchSize(modelName string, batchSize int) bool {
	if batchSize <= 1 {
		return true
	}
	modelConfig, ok := model.CacheGetModelConfig(modelName)
	if !ok {
		return false
	}
	return batchSize <= modelConfig.ImageMaxBatchSize
}
