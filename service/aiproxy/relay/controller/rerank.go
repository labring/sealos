package controller

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/logger"
	"github.com/labring/sealos/service/aiproxy/relay"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
	billingprice "github.com/labring/sealos/service/aiproxy/relay/price"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

func RerankHelper(c *gin.Context) *relaymodel.ErrorWithStatusCode {
	ctx := c.Request.Context()
	meta := meta.GetByContext(c)
	rerankRequest, err := getRerankRequest(c)
	if err != nil {
		logger.Errorf(ctx, "get rerank request failed: %s", err.Error())
		return openai.ErrorWrapper(err, "invalid_rerank_request", http.StatusBadRequest)
	}

	meta.OriginModelName = rerankRequest.Model
	rerankRequest.Model, _ = getMappedModelName(rerankRequest.Model, meta.ModelMapping)
	meta.ActualModelName = rerankRequest.Model

	price, completionPrice, ok := billingprice.GetModelPrice(meta.OriginModelName, meta.ActualModelName)
	if !ok {
		return openai.ErrorWrapper(fmt.Errorf("model price not found: %s", meta.OriginModelName), "model_price_not_found", http.StatusInternalServerError)
	}

	meta.PromptTokens = rerankPromptTokens(rerankRequest)

	ok, postGroupConsumer, err := preCheckGroupBalance(ctx, &PreCheckGroupBalanceReq{
		PromptTokens: meta.PromptTokens,
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

	requestBody, err := getRerankRequestBody(c, meta, rerankRequest, adaptor)
	if err != nil {
		logger.Errorf(ctx, "get rerank request body failed: %s", err.Error())
		return openai.ErrorWrapper(err, "invalid_rerank_request", http.StatusBadRequest)
	}

	resp, err := adaptor.DoRequest(c, meta, requestBody)
	if err != nil {
		logger.Errorf(ctx, "do rerank request failed: %s", err.Error())
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
		err := RelayErrorHandler(resp, relaymode.Rerank)
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

	usage, respErr := adaptor.DoResponse(c, resp, meta)
	if respErr != nil {
		logger.Errorf(ctx, "do rerank response failed: %+v", respErr)
		ConsumeWaitGroup.Add(1)
		go postConsumeAmount(context.Background(),
			&ConsumeWaitGroup,
			postGroupConsumer,
			http.StatusInternalServerError,
			c.Request.URL.Path,
			usage, meta, price, completionPrice, respErr.String(),
		)
		return respErr
	}

	ConsumeWaitGroup.Add(1)
	go postConsumeAmount(context.Background(),
		&ConsumeWaitGroup,
		postGroupConsumer,
		http.StatusOK,
		c.Request.URL.Path,
		usage, meta, price, completionPrice, "",
	)

	return nil
}

func getRerankRequest(c *gin.Context) (*relaymodel.RerankRequest, error) {
	rerankRequest := &relaymodel.RerankRequest{}
	err := common.UnmarshalBodyReusable(c, rerankRequest)
	if err != nil {
		return nil, err
	}
	if rerankRequest.Model == "" {
		return nil, errors.New("model parameter must be provided")
	}
	if rerankRequest.Query == "" {
		return nil, errors.New("query must not be empty")
	}
	if len(rerankRequest.Documents) == 0 {
		return nil, errors.New("document list must not be empty")
	}

	return rerankRequest, nil
}

func getRerankRequestBody(_ *gin.Context, _ *meta.Meta, textRequest *relaymodel.RerankRequest, _ adaptor.Adaptor) (io.Reader, error) {
	jsonData, err := json.Marshal(textRequest)
	if err != nil {
		return nil, err
	}
	return bytes.NewReader(jsonData), nil
}

func rerankPromptTokens(rerankRequest *relaymodel.RerankRequest) int {
	return len(rerankRequest.Query) + len(strings.Join(rerankRequest.Documents, ""))
}
