package controller

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"

	json "github.com/json-iterator/go"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/balance"
	"github.com/labring/sealos/service/aiproxy/common/helper"
	"github.com/labring/sealos/service/aiproxy/common/logger"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/channeltype"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
	billingprice "github.com/labring/sealos/service/aiproxy/relay/price"
	"github.com/shopspring/decimal"
)

func getImageRequest(c *gin.Context, _ int) (*relaymodel.ImageRequest, error) {
	imageRequest := &relaymodel.ImageRequest{}
	err := common.UnmarshalBodyReusable(c, imageRequest)
	if err != nil {
		return nil, err
	}
	if imageRequest.N == 0 {
		imageRequest.N = 1
	}
	if imageRequest.Size == "" {
		imageRequest.Size = "1024x1024"
	}
	if imageRequest.Model == "" {
		imageRequest.Model = "dall-e-2"
	}
	return imageRequest, nil
}

func validateImageRequest(imageRequest *relaymodel.ImageRequest, _ *meta.Meta) *relaymodel.ErrorWithStatusCode {
	// check prompt length
	if imageRequest.Prompt == "" {
		return openai.ErrorWrapper(errors.New("prompt is required"), "prompt_missing", http.StatusBadRequest)
	}

	// model validation
	if !billingprice.IsValidImageSize(imageRequest.Model, imageRequest.Size) {
		return openai.ErrorWrapper(errors.New("size not supported for this image model"), "size_not_supported", http.StatusBadRequest)
	}

	if !billingprice.IsValidImagePromptLength(imageRequest.Model, len(imageRequest.Prompt)) {
		return openai.ErrorWrapper(errors.New("prompt is too long"), "prompt_too_long", http.StatusBadRequest)
	}

	// Number of generated images validation
	if !billingprice.IsWithinRange(imageRequest.Model, imageRequest.N) {
		return openai.ErrorWrapper(errors.New("invalid value of n"), "n_not_within_range", http.StatusBadRequest)
	}
	return nil
}

func getImageCostPrice(imageRequest *relaymodel.ImageRequest) (float64, error) {
	if imageRequest == nil {
		return 0, errors.New("imageRequest is nil")
	}
	imageCostPrice := billingprice.GetImageSizePrice(imageRequest.Model, imageRequest.Size)
	if imageRequest.Quality == "hd" && imageRequest.Model == "dall-e-3" {
		if imageRequest.Size == "1024x1024" {
			imageCostPrice *= 2
		} else {
			imageCostPrice *= 1.5
		}
	}
	return imageCostPrice, nil
}

func RelayImageHelper(c *gin.Context, _ int) *relaymodel.ErrorWithStatusCode {
	ctx := c.Request.Context()
	meta := meta.GetByContext(c)
	imageRequest, err := getImageRequest(c, meta.Mode)
	if err != nil {
		logger.Errorf(ctx, "getImageRequest failed: %s", err.Error())
		return openai.ErrorWrapper(err, "invalid_image_request", http.StatusBadRequest)
	}

	// map model name
	var isModelMapped bool
	meta.OriginModelName = imageRequest.Model
	imageRequest.Model, isModelMapped = getMappedModelName(imageRequest.Model, meta.ModelMapping)
	meta.ActualModelName = imageRequest.Model

	// model validation
	bizErr := validateImageRequest(imageRequest, meta)
	if bizErr != nil {
		return bizErr
	}

	imageCostPrice, err := getImageCostPrice(imageRequest)
	if err != nil {
		return openai.ErrorWrapper(err, "get_image_cost_price_failed", http.StatusInternalServerError)
	}

	// Convert the original image model
	imageRequest.Model, _ = getMappedModelName(imageRequest.Model, billingprice.GetImageOriginModelName())
	c.Set("response_format", imageRequest.ResponseFormat)

	adaptor := relay.GetAdaptor(meta.APIType)
	if adaptor == nil {
		return openai.ErrorWrapper(fmt.Errorf("invalid api type: %d", meta.APIType), "invalid_api_type", http.StatusBadRequest)
	}
	adaptor.Init(meta)

	var requestBody io.Reader
	switch meta.ChannelType {
	case channeltype.Ali,
		channeltype.Baidu,
		channeltype.Zhipu:
		finalRequest, err := adaptor.ConvertImageRequest(imageRequest)
		if err != nil {
			return openai.ErrorWrapper(err, "convert_image_request_failed", http.StatusInternalServerError)
		}
		jsonStr, err := json.Marshal(finalRequest)
		if err != nil {
			return openai.ErrorWrapper(err, "marshal_image_request_failed", http.StatusInternalServerError)
		}
		requestBody = bytes.NewReader(jsonStr)
	default:
		if isModelMapped || meta.ChannelType == channeltype.Azure { // make Azure channel request body
			jsonStr, err := json.Marshal(imageRequest)
			if err != nil {
				return openai.ErrorWrapper(err, "marshal_image_request_failed", http.StatusInternalServerError)
			}
			requestBody = bytes.NewReader(jsonStr)
		} else {
			requestBody = c.Request.Body
		}
	}

	groupRemainBalance, postGroupConsumer, err := balance.Default.GetGroupRemainBalance(ctx, meta.Group)
	if err != nil {
		return openai.ErrorWrapper(err, "get_group_remain_balance_failed", http.StatusInternalServerError)
	}

	amount := decimal.NewFromFloat(imageCostPrice).Mul(decimal.NewFromInt(int64(imageRequest.N))).InexactFloat64()

	if groupRemainBalance-amount < 0 {
		return openai.ErrorWrapper(errors.New("group balance is not enough"), "insufficient_group_balance", http.StatusForbidden)
	}

	// do request
	resp, err := adaptor.DoRequest(c, meta, requestBody)
	if err != nil {
		logger.Errorf(ctx, "DoRequest failed: %s", err.Error())
		return openai.ErrorWrapper(err, "do_request_failed", http.StatusInternalServerError)
	}

	defer func() {
		if resp == nil || resp.StatusCode != http.StatusOK {
			_ = model.RecordConsumeLog(ctx, meta.Group, resp.StatusCode, meta.ChannelID, imageRequest.N, 0, imageRequest.Model, meta.TokenID, meta.TokenName, 0, imageCostPrice, 0, c.Request.URL.Path, imageRequest.Size)
			return
		}

		consumeCtx := context.WithValue(context.Background(), helper.RequestIDKey, ctx.Value(helper.RequestIDKey))
		_amount, err := postGroupConsumer.PostGroupConsume(consumeCtx, meta.TokenName, amount)
		if err != nil {
			logger.Error(ctx, "error consuming token remain balance: "+err.Error())
			err = model.CreateConsumeError(meta.Group, meta.TokenName, imageRequest.Model, err.Error(), amount, meta.TokenID)
			if err != nil {
				logger.Error(ctx, "failed to create consume error: "+err.Error())
			}
		} else {
			amount = _amount
		}
		err = model.BatchRecordConsume(consumeCtx, meta.Group, resp.StatusCode, meta.ChannelID, imageRequest.N, 0, imageRequest.Model, meta.TokenID, meta.TokenName, amount, imageCostPrice, 0, c.Request.URL.Path, imageRequest.Size)
		if err != nil {
			logger.Error(ctx, "failed to record consume log: "+err.Error())
		}
	}()

	// do response
	_, respErr := adaptor.DoResponse(c, resp, meta)
	if respErr != nil {
		logger.Errorf(ctx, "respErr is not nil: %+v", respErr)
		return respErr
	}

	return nil
}
