package price

import (
	"errors"
	"fmt"

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
	if len(modelConfig.ImagePrices) == 0 {
		return 0, true
	}
	price, ok := modelConfig.ImagePrices[size]
	return price, ok
}

func ValidateImageMaxBatchSize(modelName string, batchSize int) error {
	if batchSize <= 1 {
		return nil
	}
	modelConfig, ok := model.CacheGetModelConfig(modelName)
	if !ok {
		return errors.New("model not found")
	}
	if modelConfig.ImageMaxBatchSize <= 0 {
		return nil
	}
	if batchSize > modelConfig.ImageMaxBatchSize {
		return fmt.Errorf("batch size %d is greater than the maximum batch size %d", batchSize, modelConfig.ImageMaxBatchSize)
	}
	return nil
}
