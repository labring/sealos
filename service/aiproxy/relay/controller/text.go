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

func RelayTextHelper(meta *meta.Meta, c *gin.Context) *relaymodel.ErrorWithStatusCode {
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

	textRequest, err := utils.UnmarshalGeneralOpenAIRequest(c.Request)
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
		return openai.ErrorWrapper(fmt.Errorf("get and validate text request failed: %s", err.Error()), "invalid_text_request", http.StatusBadRequest)
	}

	// get model price
	price, completionPrice, ok := billingprice.GetModelPrice(meta.OriginModelName, meta.ActualModelName)
	if !ok {
		return openai.ErrorWrapper(fmt.Errorf("model price not found: %s", meta.OriginModelName), "model_price_not_found", http.StatusInternalServerError)
	}
	// pre-consume balance
	meta.InputTokens = openai.GetPromptTokens(meta, textRequest)

	ok = preCheckGroupBalance(&PreCheckGroupBalanceReq{
		InputTokens: meta.InputTokens,
		MaxTokens:   textRequest.MaxTokens,
		Price:       price,
	}, meta, groupRemainBalance)
	if !ok {
		ConsumeWaitGroup.Add(1)
		go postConsumeAmount(context.Background(),
			&ConsumeWaitGroup,
			postGroupConsumer,
			http.StatusForbidden,
			nil,
			meta,
			0,
			0,
			"group balance is not enough",
			nil,
		)
		return openai.ErrorWrapper(errors.New("group balance is not enough"), "insufficient_group_balance", http.StatusForbidden)
	}

	// do response
	usage, detail, respErr := DoHelper(adaptor, c, meta)
	if respErr != nil {
		if detail != nil && config.DebugEnabled {
			log.Errorf("do text failed: %s\nrequest detail:\n%s\nresponse detail:\n%s", respErr, detail.RequestBody, detail.ResponseBody)
		} else {
			log.Errorf("do text failed: %s", respErr)
		}
		ConsumeWaitGroup.Add(1)
		go postConsumeAmount(context.Background(),
			&ConsumeWaitGroup,
			postGroupConsumer,
			respErr.StatusCode,
			usage,
			meta,
			price,
			completionPrice,
			respErr.String(),
			detail,
		)
		return respErr
	}
	// post-consume amount
	ConsumeWaitGroup.Add(1)
	go postConsumeAmount(context.Background(),
		&ConsumeWaitGroup,
		postGroupConsumer,
		http.StatusOK,
		usage,
		meta,
		price,
		completionPrice,
		"",
		nil,
	)
	return nil
}
