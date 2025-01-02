package controller

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/common/conv"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/channeltype"
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

func getImageCostPrice(modelName string, reqModel string, size string) (float64, error) {
	imageCostPrice, ok := billingprice.GetImageSizePrice(modelName, reqModel, size)
	if !ok {
		return 0, fmt.Errorf("invalid image size: %s", size)
	}
	return imageCostPrice, nil
}

func RelayImageHelper(meta *meta.Meta, c *gin.Context) *relaymodel.ErrorWithStatusCode {
	log := middleware.GetLogger(c)
	ctx := c.Request.Context()

	adaptor, ok := channeltype.GetAdaptor(meta.Channel.Type)
	if !ok {
		log.Errorf("invalid (%s[%d]) channel type: %d", meta.Channel.Name, meta.Channel.ID, meta.Channel.Type)
		return openai.ErrorWrapperWithMessage("invalid channel error", "invalid_channel_type", http.StatusInternalServerError)
	}

	groupRemainBalance, postGroupConsumer, err := getGroupBalance(ctx, meta)
	if err != nil {
		log.Errorf("get group (%s) balance failed: %v", meta.Group.ID, err)
		return openai.ErrorWrapper(
			fmt.Errorf("get group (%s) balance failed", meta.Group.ID),
			"get_group_quota_failed",
			http.StatusInternalServerError,
		)
	}

	imageRequest, err := getImageRequest(c)
	if err != nil {
		log.Errorf("get request failed: %s", err.Error())
		var detail model.RequestDetail
		reqDetail, err := common.GetRequestBody(c.Request)
		if err != nil {
			log.Errorf("get request body failed: %s", err.Error())
		} else {
			detail.RequestBody = conv.BytesToString(reqDetail)
		}
		ConsumeWaitGroup.Add(1)
		go postConsumeAmount(context.Background(),
			&ConsumeWaitGroup,
			nil,
			http.StatusBadRequest,
			nil,
			meta,
			0,
			0,
			err.Error(),
			&detail,
		)
		return openai.ErrorWrapper(err, "invalid_image_request", http.StatusBadRequest)
	}

	imageCostPrice, err := getImageCostPrice(meta.OriginModelName, meta.ActualModelName, imageRequest.Size)
	if err != nil {
		return openai.ErrorWrapper(err, "get_image_cost_price_failed", http.StatusInternalServerError)
	}

	meta.InputTokens = imageRequest.N

	ok = preCheckGroupBalance(&PreCheckGroupBalanceReq{
		InputTokens: meta.InputTokens,
		Price:       imageCostPrice,
	}, meta, groupRemainBalance)
	if !ok {
		return openai.ErrorWrapper(errors.New("group balance is not enough"), "insufficient_group_balance", http.StatusForbidden)
	}

	// do response
	usage, detail, respErr := DoHelper(adaptor, c, meta)
	if respErr != nil {
		if detail != nil && config.DebugEnabled {
			log.Errorf("do image failed: %s\nrequest detail:\n%s\nresponse detail:\n%s", respErr, detail.RequestBody, detail.ResponseBody)
		} else {
			log.Errorf("do image failed: %s", respErr)
		}
		ConsumeWaitGroup.Add(1)
		go postConsumeAmount(context.Background(),
			&ConsumeWaitGroup,
			postGroupConsumer,
			respErr.StatusCode,
			usage,
			meta,
			imageCostPrice,
			0,
			respErr.String(),
			detail,
		)
		return respErr
	}

	ConsumeWaitGroup.Add(1)
	go postConsumeAmount(context.Background(),
		&ConsumeWaitGroup,
		postGroupConsumer,
		http.StatusOK,
		usage,
		meta,
		imageCostPrice,
		0,
		imageRequest.Size,
		nil,
	)

	return nil
}
