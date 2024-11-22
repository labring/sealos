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
	"github.com/labring/sealos/service/aiproxy/common/helper"
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
	// get & validate textRequest
	textRequest, err := getAndValidateTextRequest(c, meta.Mode)
	if err != nil {
		logger.Errorf(ctx, "getAndValidateTextRequest failed: %s", err.Error())
		return openai.ErrorWrapper(err, "invalid_text_request", http.StatusBadRequest)
	}
	meta.IsStream = textRequest.Stream

	// map model name
	meta.OriginModelName = textRequest.Model
	textRequest.Model, _ = getMappedModelName(textRequest.Model, meta.ModelMapping)
	meta.ActualModelName = textRequest.Model

	// get model price
	price, ok := billingprice.GetModelPrice(meta.OriginModelName, meta.ActualModelName, meta.ChannelType)
	if !ok {
		return openai.ErrorWrapper(fmt.Errorf("model price not found: %s", meta.OriginModelName), "model_price_not_found", http.StatusInternalServerError)
	}
	completionPrice, ok := billingprice.GetCompletionPrice(meta.OriginModelName, meta.ActualModelName, meta.ChannelType)
	if !ok {
		return openai.ErrorWrapper(fmt.Errorf("completion price not found: %s", meta.OriginModelName), "completion_price_not_found", http.StatusInternalServerError)
	}
	// pre-consume balance
	promptTokens := getPromptTokens(textRequest, meta.Mode)
	meta.PromptTokens = promptTokens
	ok, postGroupConsume, bizErr := preCheckGroupBalance(ctx, textRequest, promptTokens, price, meta)
	if bizErr != nil {
		logger.Warnf(ctx, "preConsumeAmount failed: %+v", *bizErr)
		return bizErr
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
		return openai.ErrorWrapper(err, "convert_request_failed", http.StatusInternalServerError)
	}

	// do request
	resp, err := adaptor.DoRequest(c, meta, requestBody)
	if err != nil {
		logger.Errorf(ctx, "DoRequest failed: %s", err.Error())
		return openai.ErrorWrapper(err, "do_request_failed", http.StatusInternalServerError)
	}
	consumeCtx := context.WithValue(context.Background(), helper.RequestIDKey, ctx.Value(helper.RequestIDKey))
	if isErrorHappened(meta, resp) {
		err := RelayErrorHandler(resp)
		ConsumeWaitGroup.Add(1)
		go postConsumeAmount(consumeCtx, &ConsumeWaitGroup, postGroupConsume, resp.StatusCode, c.Request.URL.Path, nil, meta, price, completionPrice, err.Error.Message)
		return err
	}

	// do response
	usage, respErr := adaptor.DoResponse(c, resp, meta)
	if respErr != nil {
		logger.Errorf(ctx, "respErr is not nil: %+v", respErr)
		ConsumeWaitGroup.Add(1)
		go postConsumeAmount(consumeCtx, &ConsumeWaitGroup, postGroupConsume, respErr.StatusCode, c.Request.URL.Path, usage, meta, price, completionPrice, respErr.Error.Message)
		return respErr
	}
	// post-consume amount
	ConsumeWaitGroup.Add(1)
	go postConsumeAmount(consumeCtx, &ConsumeWaitGroup, postGroupConsume, resp.StatusCode, c.Request.URL.Path, usage, meta, price, completionPrice, "")
	return nil
}

func getRequestBody(c *gin.Context, meta *meta.Meta, textRequest *model.GeneralOpenAIRequest, adaptor adaptor.Adaptor) (io.Reader, error) {
	convertedRequest, err := adaptor.ConvertRequest(c, meta.Mode, textRequest)
	if err != nil {
		logger.Debugf(c.Request.Context(), "converted request failed: %s\n", err.Error())
		return nil, err
	}
	jsonData, err := json.Marshal(convertedRequest)
	if err != nil {
		logger.Debugf(c.Request.Context(), "converted request json_marshal_failed: %s\n", err.Error())
		return nil, err
	}
	logger.Debugf(c.Request.Context(), "converted request: \n%s", jsonData)
	return bytes.NewReader(jsonData), nil
}
