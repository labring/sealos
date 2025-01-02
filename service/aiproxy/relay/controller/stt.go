package controller

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/channeltype"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
	billingprice "github.com/labring/sealos/service/aiproxy/relay/price"
)

func RelaySTTHelper(meta *meta.Meta, c *gin.Context) *relaymodel.ErrorWithStatusCode {
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

	price, completionPrice, ok := billingprice.GetModelPrice(meta.OriginModelName, meta.ActualModelName)
	if !ok {
		return openai.ErrorWrapper(fmt.Errorf("model price not found: %s", meta.OriginModelName), "model_price_not_found", http.StatusInternalServerError)
	}

	ok = preCheckGroupBalance(&PreCheckGroupBalanceReq{
		InputTokens: meta.InputTokens,
		Price:       price,
	}, meta, groupRemainBalance)
	if !ok {
		return openai.ErrorWrapper(errors.New("group balance is not enough"), "insufficient_group_balance", http.StatusForbidden)
	}

	usage, detail, respErr := DoHelper(adaptor, c, meta)
	if respErr != nil {
		if detail != nil && config.DebugEnabled {
			log.Errorf("do stt failed: %s\nrequest detail:\n%s\nresponse detail:\n%s", respErr, detail.RequestBody, detail.ResponseBody)
		} else {
			log.Errorf("do stt failed: %s", respErr)
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
