package controller

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common/logger"
	"github.com/labring/sealos/service/aiproxy/relay"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/model"
	billingprice "github.com/labring/sealos/service/aiproxy/relay/price"
)

func RelayTextHelper(c *gin.Context) *model.ErrorWithStatusCode {
	ctx := c.Request.Context()
	meta := meta.GetByContext(c)
	textRequest, err := getAndValidateTextRequest(c, meta.Mode)
	if err != nil {
		logger.Errorf(ctx, "get and validate text request failed: %s", err.Error())
		return openai.ErrorWrapper(err, "invalid_text_request", http.StatusBadRequest)
	}
	meta.IsStream = textRequest.Stream

	// map model name
	meta.OriginModelName = textRequest.Model
	textRequest.Model, _ = getMappedModelName(textRequest.Model, meta.ModelMapping)
	meta.ActualModelName = textRequest.Model

	// get model price
	price, completionPrice, ok := billingprice.GetModelPrice(meta.OriginModelName, meta.ActualModelName)
	if !ok {
		return openai.ErrorWrapper(fmt.Errorf("model price not found: %s", meta.OriginModelName), "model_price_not_found", http.StatusInternalServerError)
	}
	// pre-consume balance
	promptTokens := getPromptTokens(textRequest, meta.Mode)
	meta.PromptTokens = promptTokens
	ok, postGroupConsumer, err := preCheckGroupBalance(ctx, &PreCheckGroupBalanceReq{
		PromptTokens: promptTokens,
		MaxTokens:    textRequest.MaxTokens,
		Price:        price,
	}, meta)
	if err != nil {
		logger.Errorf(ctx, "get group (%s) balance failed: %s", meta.Group, err)
		return openai.ErrorWrapper(
			fmt.Errorf("get group (%s) balance failed", meta.Group),
			"get_group_quota_failed",
			http.StatusInternalServerError,
		)
	}
	if !ok {
		return openai.ErrorWrapper(errors.New("group balance is not enough"), "insufficient_group_balance", http.StatusForbidden)
	}

	adaptor := relay.GetAdaptor(meta.APIType)
	if adaptor == nil {
		return openai.ErrorWrapper(fmt.Errorf("invalid api type: %d", meta.APIType), "invalid_api_type", http.StatusBadRequest)
	}
	adaptor.Init(meta)

	// get request body
	requestBody, err := getRequestBody(c, meta, textRequest, adaptor)
	if err != nil {
		logger.Errorf(ctx, "get request body failed: %s", err.Error())
		return openai.ErrorWrapper(err, "convert_request_failed", http.StatusInternalServerError)
	}
	logger.Debugf(ctx, "converted request: \n%s", requestBody)

	// do request
	resp, err := adaptor.DoRequest(c, meta, requestBody)
	if err != nil {
		logger.Errorf(ctx, "do request failed: %s", err.Error())
		ConsumeWaitGroup.Add(1)
		go postConsumeAmount(context.Background(),
			&ConsumeWaitGroup,
			postGroupConsumer,
			http.StatusInternalServerError,
			c.Request.URL.Path,
			nil, meta, price, completionPrice, err.Error(),
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
			price,
			completionPrice,
			err.String(),
		)
		return err
	}

	// do response
	usage, respErr := adaptor.DoResponse(c, resp, meta)
	if respErr != nil {
		logger.Errorf(ctx, "do response failed: %s", respErr)
		ConsumeWaitGroup.Add(1)
		go postConsumeAmount(context.Background(),
			&ConsumeWaitGroup,
			postGroupConsumer,
			respErr.StatusCode,
			c.Request.URL.Path,
			usage,
			meta,
			price,
			completionPrice,
			respErr.String(),
		)
		return respErr
	}
	// post-consume amount
	ConsumeWaitGroup.Add(1)
	go postConsumeAmount(context.Background(),
		&ConsumeWaitGroup,
		postGroupConsumer,
		resp.StatusCode,
		c.Request.URL.Path,
		usage, meta, price, completionPrice, "",
	)
	return nil
}

func getRequestBody(c *gin.Context, meta *meta.Meta, textRequest *model.GeneralOpenAIRequest, adaptor adaptor.Adaptor) (io.Reader, error) {
	convertedRequest, err := adaptor.ConvertRequest(c, meta.Mode, textRequest)
	if err != nil {
		return nil, err
	}
	jsonData, err := json.Marshal(convertedRequest)
	if err != nil {
		return nil, err
	}
	return bytes.NewReader(jsonData), nil
}
