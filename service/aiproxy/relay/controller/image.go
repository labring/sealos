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
	"github.com/labring/sealos/service/aiproxy/common/logger"
	"github.com/labring/sealos/service/aiproxy/relay"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
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

	// Number of generated images validation
	if !billingprice.ValidateImageMaxBatchSize(imageRequest.Model, imageRequest.N) {
		return openai.ErrorWrapper(errors.New("invalid value of n"), "n_not_within_range", http.StatusBadRequest)
	}
	return nil
}

func getImageCostPrice(modelName string, reqModel string, size string) (float64, error) {
	imageCostPrice, ok := billingprice.GetImageSizePrice(modelName, reqModel, size)
	if !ok {
		return 0, fmt.Errorf("invalid image size: %s", size)
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
	meta.OriginModelName = imageRequest.Model
	imageRequest.Model, _ = getMappedModelName(imageRequest.Model, meta.ModelMapping)
	meta.ActualModelName = imageRequest.Model

	// model validation
	bizErr := validateImageRequest(imageRequest, meta)
	if bizErr != nil {
		return bizErr
	}

	imageCostPrice, err := getImageCostPrice(meta.OriginModelName, meta.ActualModelName, imageRequest.Size)
	if err != nil {
		return openai.ErrorWrapper(err, "get_image_cost_price_failed", http.StatusInternalServerError)
	}

	c.Set("response_format", imageRequest.ResponseFormat)

	adaptor := relay.GetAdaptor(meta.APIType)
	if adaptor == nil {
		return openai.ErrorWrapper(fmt.Errorf("invalid api type: %d", meta.APIType), "invalid_api_type", http.StatusBadRequest)
	}
	adaptor.Init(meta)

	requestBody, err := getImageRequestBody(c, meta, imageRequest, adaptor)
	if err != nil {
		return openai.ErrorWrapper(err, "get_image_request_body_failed", http.StatusInternalServerError)
	}

	groupRemainBalance, postGroupConsumer, err := balance.Default.GetGroupRemainBalance(ctx, meta.Group)
	if err != nil {
		logger.Errorf(ctx, "get group (%s) balance failed: %s", meta.Group, err)
		return openai.ErrorWrapper(
			fmt.Errorf("get group (%s) balance failed", meta.Group),
			"get_group_remain_balance_failed",
			http.StatusInternalServerError,
		)
	}

	amount := decimal.NewFromFloat(imageCostPrice).Mul(decimal.NewFromInt(int64(imageRequest.N))).InexactFloat64()

	if groupRemainBalance-amount < 0 {
		return openai.ErrorWrapper(
			errors.New("group balance is not enough"),
			"insufficient_group_balance",
			http.StatusForbidden,
		)
	}

	// do request
	resp, err := adaptor.DoRequest(c, meta, requestBody)
	if err != nil {
		logger.Errorf(ctx, "do request failed: %s", err.Error())
		ConsumeWaitGroup.Add(1)
		go postConsumeAmount(context.Background(),
			&ConsumeWaitGroup,
			postGroupConsumer,
			http.StatusInternalServerError,
			c.Request.URL.Path, nil, meta, imageCostPrice, 0, err.Error(),
		)
		return openai.ErrorWrapper(err, "do_request_failed", http.StatusInternalServerError)
	}

	if isErrorHappened(meta, resp) {
		err := RelayErrorHandler(resp, meta.Mode)
		ConsumeWaitGroup.Add(1)
		go postConsumeAmount(context.Background(),
			&ConsumeWaitGroup,
			postGroupConsumer,
			resp.StatusCode,
			c.Request.URL.Path,
			nil,
			meta,
			imageCostPrice,
			0,
			err.String(),
		)
		return err
	}

	// do response
	_, respErr := adaptor.DoResponse(c, resp, meta)
	if respErr != nil {
		logger.Errorf(ctx, "do response failed: %s", respErr)
		ConsumeWaitGroup.Add(1)
		go postConsumeAmount(context.Background(),
			&ConsumeWaitGroup,
			postGroupConsumer,
			respErr.StatusCode,
			c.Request.URL.Path,
			nil,
			meta,
			imageCostPrice,
			0,
			respErr.String(),
		)
		return respErr
	}

	ConsumeWaitGroup.Add(1)
	go postConsumeAmount(context.Background(),
		&ConsumeWaitGroup,
		postGroupConsumer,
		resp.StatusCode,
		c.Request.URL.Path,
		nil, meta, imageCostPrice, 0, imageRequest.Size,
	)

	return nil
}

func getImageRequestBody(_ *gin.Context, _ *meta.Meta, imageRequest *relaymodel.ImageRequest, adaptor adaptor.Adaptor) (io.Reader, error) {
	convertedRequest, err := adaptor.ConvertImageRequest(imageRequest)
	if err != nil {
		return nil, err
	}
	jsonStr, err := json.Marshal(convertedRequest)
	if err != nil {
		return nil, err
	}
	return bytes.NewReader(jsonStr), nil
}
