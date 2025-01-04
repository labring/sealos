package controller

import (
	"errors"
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/utils"
)

func validateImageMaxBatchSize(modelConfig *model.ModelConfig, batchSize int) error {
	if batchSize <= 1 {
		return nil
	}
	if modelConfig.ImageMaxBatchSize <= 0 {
		return nil
	}
	if batchSize > modelConfig.ImageMaxBatchSize {
		return fmt.Errorf("batch size %d is greater than the maximum batch size %d", batchSize, modelConfig.ImageMaxBatchSize)
	}
	return nil
}

func getImageRequest(meta *meta.Meta, c *gin.Context) (*relaymodel.ImageRequest, error) {
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
	if err := validateImageMaxBatchSize(meta.ModelConfig, imageRequest.N); err != nil {
		return nil, err
	}
	return imageRequest, nil
}

func RelayImageHelper(meta *meta.Meta, c *gin.Context) *relaymodel.ErrorWithStatusCode {
	return Handle(meta, c, func() (*PreCheckGroupBalanceReq, error) {
		imageRequest, err := getImageRequest(meta, c)
		if err != nil {
			return nil, err
		}

		imageCostPrice, ok := GetImageSizePrice(meta.ModelConfig, imageRequest.Size)
		if !ok {
			return nil, fmt.Errorf("invalid image size: %s", imageRequest.Size)
		}

		return &PreCheckGroupBalanceReq{
			InputTokens: imageRequest.N,
			InputPrice:  imageCostPrice,
		}, nil
	})
}
