package controller

import (
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/model"
)

func GetModelPrice(modelConfig *model.ModelConfig) (float64, float64, bool) {
	if !config.GetBillingEnabled() {
		return 0, 0, true
	}
	return modelConfig.InputPrice, modelConfig.OutputPrice, true
}

func GetImageSizePrice(modelConfig *model.ModelConfig, size string) (float64, bool) {
	if !config.GetBillingEnabled() {
		return 0, false
	}
	if len(modelConfig.ImagePrices) == 0 {
		return 0, true
	}
	price, ok := modelConfig.ImagePrices[size]
	return price, ok
}
