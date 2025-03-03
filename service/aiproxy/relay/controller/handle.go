package controller

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/common/consume"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/channeltype"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
)

func Handle(meta *meta.Meta, c *gin.Context, preProcess func() (*PreCheckGroupBalanceReq, error)) *relaymodel.ErrorWithStatusCode {
	log := middleware.GetLogger(c)

	// 1. Get adaptor
	adaptor, ok := channeltype.GetAdaptor(meta.Channel.Type)
	if !ok {
		log.Errorf("invalid (%s[%d]) channel type: %d", meta.Channel.Name, meta.Channel.ID, meta.Channel.Type)
		return openai.ErrorWrapperWithMessage(
			"invalid channel error", "invalid_channel_type", http.StatusInternalServerError)
	}

	// 2. Get group balance
	groupRemainBalance, postGroupConsumer, err := getGroupBalance(c, meta)
	if err != nil {
		log.Errorf("get group (%s) balance failed: %v", meta.Group.ID, err)
		errMsg := fmt.Sprintf("get group (%s) balance failed", meta.Group.ID)
		consume.AsyncConsume(
			nil,
			http.StatusInternalServerError,
			nil,
			meta,
			0,
			0,
			errMsg,
			c.ClientIP(),
			nil,
		)
		return openai.ErrorWrapperWithMessage(
			errMsg,
			"get_group_quota_failed",
			http.StatusInternalServerError,
		)
	}

	if !meta.IsChannelTest && groupRemainBalance <= 0 {
		return openai.ErrorWrapperWithMessage(fmt.Sprintf("group (%s) balance not enough", meta.Group.ID), "insufficient_group_balance", http.StatusForbidden)
	}

	// 3. Pre-process request
	preCheckReq, err := preProcess()
	if err != nil {
		log.Errorf("pre-process request failed: %s", err.Error())
		detail := &model.RequestDetail{}
		if err := getRequestBody(meta, c, detail); err != nil {
			log.Errorf("get request body failed: %v", err.Error)
		}
		consume.AsyncConsume(
			nil,
			http.StatusBadRequest,
			nil,
			meta,
			0,
			0,
			err.Error(),
			c.ClientIP(),
			detail,
		)
		return openai.ErrorWrapper(err, "invalid_request", http.StatusBadRequest)
	}

	// 4. Pre-check balance
	ok = checkGroupBalance(preCheckReq, meta, groupRemainBalance)
	if !ok {
		return openai.ErrorWrapperWithMessage(fmt.Sprintf("group (%s) balance is not enough", meta.Group.ID), "insufficient_group_balance", http.StatusForbidden)
	}

	meta.InputTokens = preCheckReq.InputTokens

	// 5. Do request
	usage, detail, respErr := DoHelper(adaptor, c, meta)
	if respErr != nil {
		var logDetail *model.RequestDetail
		if detail != nil && config.DebugEnabled {
			logDetail = detail
			log.Errorf(
				"handle failed: %+v\nrequest detail:\n%s\nresponse detail:\n%s",
				respErr.Error,
				logDetail.RequestBody,
				logDetail.ResponseBody,
			)
		} else {
			log.Errorf("handle failed: %+v", respErr.Error)
		}

		consume.AsyncConsume(
			postGroupConsumer,
			respErr.StatusCode,
			usage,
			meta,
			preCheckReq.InputPrice,
			preCheckReq.OutputPrice,
			respErr.Error.JSONOrEmpty(),
			c.ClientIP(),
			detail,
		)
		return respErr
	}

	amount := consume.CalculateAmount(usage, preCheckReq.InputPrice, preCheckReq.OutputPrice)
	if amount > 0 {
		log.Data["amount"] = strconv.FormatFloat(amount, 'f', -1, 64)
	}

	if !config.GetSaveAllLogDetail() {
		detail = nil
	}

	// 6. Post consume
	consume.AsyncConsume(
		postGroupConsumer,
		http.StatusOK,
		usage,
		meta,
		preCheckReq.InputPrice,
		preCheckReq.OutputPrice,
		"",
		c.ClientIP(),
		detail,
	)

	return nil
}
