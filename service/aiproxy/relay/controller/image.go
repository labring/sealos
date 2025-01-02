package controller

import (
	"errors"
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
	billingprice "github.com/labring/sealos/service/aiproxy/relay/price"
	"github.com/labring/sealos/service/aiproxy/relay/utils"
)

func getImageRequest(c *gin.Context) (*relaymodel.ImageRequest, error) {
	imageRequest, err := utils.UnmarshalImageRequest(c.Request)
	if err != nil {
		return nil, err
	}
	if imageRequest.Prompt == "" {
		return nil, errors.New("prompt is required")
	}
	if imageRequest.Size == "" {
		return nil, errors.New("size is required")
	}
	if imageRequest.N == 0 {
		imageRequest.N = 1
	}
	if err := billingprice.ValidateImageMaxBatchSize(imageRequest.Model, imageRequest.N); err != nil {
		return nil, err
	}
	return imageRequest, nil
}

func getImageCostPrice(model string, size string) (float64, error) {
	imageCostPrice, ok := billingprice.GetImageSizePrice(model, size)
	if !ok {
		return 0, fmt.Errorf("invalid image size: %s", size)
	}
	return imageCostPrice, nil
}

func RelayImageHelper(meta *meta.Meta, c *gin.Context) *relaymodel.ErrorWithStatusCode {
	return Handle(meta, c, func() (*PreCheckGroupBalanceReq, error) {
		imageRequest, err := getImageRequest(c)
		if err != nil {
			return nil, err
		}

		imageCostPrice, err := getImageCostPrice(meta.OriginModel, imageRequest.Size)
		if err != nil {
			return nil, err
		}

		return &PreCheckGroupBalanceReq{
			InputTokens: imageRequest.N,
			InputPrice:  imageCostPrice,
		}, nil
	})
}
