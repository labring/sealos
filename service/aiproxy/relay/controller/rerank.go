package controller

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"

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

func RerankHelper(meta *meta.Meta, c *gin.Context) *relaymodel.ErrorWithStatusCode {
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

	rerankRequest, err := getRerankRequest(c)
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
		return openai.ErrorWrapper(err, "invalid_rerank_request", http.StatusBadRequest)
	}

	price, completionPrice, ok := billingprice.GetModelPrice(meta.OriginModelName, meta.ActualModelName)
	if !ok {
		return openai.ErrorWrapper(fmt.Errorf("model price not found: %s", meta.OriginModelName), "model_price_not_found", http.StatusInternalServerError)
	}

	meta.InputTokens = rerankPromptTokens(rerankRequest)

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
			log.Errorf("do rerank failed: %s\nrequest detail:\n%s\nresponse detail:\n%s", respErr, detail.RequestBody, detail.ResponseBody)
		} else {
			log.Errorf("do rerank failed: %s", respErr)
		}
		ConsumeWaitGroup.Add(1)
		go postConsumeAmount(context.Background(),
			&ConsumeWaitGroup,
			postGroupConsumer,
			http.StatusInternalServerError,
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

func getRerankRequest(c *gin.Context) (*relaymodel.RerankRequest, error) {
	rerankRequest, err := utils.UnmarshalRerankRequest(c.Request)
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

func rerankPromptTokens(rerankRequest *relaymodel.RerankRequest) int {
	return len(rerankRequest.Query) + len(strings.Join(rerankRequest.Documents, ""))
}
