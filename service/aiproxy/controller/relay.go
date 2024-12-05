package controller

import (
	"bytes"
	"fmt"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/common/ctxkey"
	"github.com/labring/sealos/service/aiproxy/common/helper"
	"github.com/labring/sealos/service/aiproxy/middleware"
	dbmodel "github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/monitor"
	"github.com/labring/sealos/service/aiproxy/relay/controller"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

// https://platform.openai.com/docs/api-reference/chat

func relayHelper(meta *meta.Meta, c *gin.Context) *model.ErrorWithStatusCode {
	log := middleware.GetLogger(c)
	log.Data["mode"] = meta.Mode
	log.Data["model"] = meta.OriginModelName
	log.Data["chname"] = meta.Channel.Name
	log.Data["chid"] = meta.Channel.ID
	log.Data["chtype"] = meta.Channel.Type
	switch meta.Mode {
	case relaymode.ImagesGenerations:
		return controller.RelayImageHelper(meta, c)
	case relaymode.AudioSpeech:
		return controller.RelayTTSHelper(meta, c)
	case relaymode.AudioTranslation:
		return controller.RelaySTTHelper(meta, c)
	case relaymode.AudioTranscription:
		return controller.RelaySTTHelper(meta, c)
	case relaymode.Rerank:
		return controller.RerankHelper(meta, c)
	default:
		return controller.RelayTextHelper(meta, c)
	}
}

func Relay(c *gin.Context) {
	log := middleware.GetLogger(c)
	if config.DebugEnabled {
		requestBody, _ := common.GetRequestBody(c.Request)
		log.Debugf("request body: %s", requestBody)
	}
	meta := middleware.NewMetaByContext(c)
	bizErr := relayHelper(meta, c)
	if bizErr == nil {
		monitor.Emit(meta.Channel.ID, true)
		return
	}
	lastFailedChannelID := meta.Channel.ID
	group := c.MustGet(ctxkey.Group).(*dbmodel.GroupCache)
	log.Errorf("relay error (channel id %d, group: %s): %s", meta.Channel.ID, group.ID, bizErr)
	go processChannelRelayError(meta.Channel.ID, bizErr)
	requestID := c.GetString(string(helper.RequestIDKey))
	retryTimes := config.GetRetryTimes()
	if !shouldRetry(c, bizErr.StatusCode) {
		log.Errorf("relay error happen, status code is %d, won't retry in this case", bizErr.StatusCode)
		retryTimes = 0
	}
	for i := retryTimes; i > 0; i-- {
		channel, err := dbmodel.CacheGetRandomSatisfiedChannel(meta.OriginModelName)
		if err != nil {
			log.Errorf("get random satisfied channel failed: %+v", err)
			break
		}
		log.Infof("using channel #%d to retry (remain times %d)", channel.ID, i)
		if channel.ID == lastFailedChannelID {
			continue
		}
		requestBody, err := common.GetRequestBody(c.Request)
		if err != nil {
			log.Errorf("GetRequestBody failed: %+v", err)
			break
		}
		c.Request.Body = io.NopCloser(bytes.NewBuffer(requestBody))
		meta.Reset(channel)
		bizErr = relayHelper(meta, c)
		if bizErr == nil {
			return
		}
		lastFailedChannelID = channel.ID
		log.Errorf("relay error (channel id %d, group: %s): %s", channel.ID, group.ID, bizErr)
		go processChannelRelayError(channel.ID, bizErr)
	}
	if bizErr != nil {
		message := bizErr.Message
		if bizErr.StatusCode == http.StatusTooManyRequests {
			message = "The upstream load of the current group is saturated, please try again later"
		}
		c.JSON(bizErr.StatusCode, gin.H{
			"error": helper.MessageWithRequestID(message, requestID),
		})
	}
}

func shouldRetry(_ *gin.Context, statusCode int) bool {
	if statusCode == http.StatusTooManyRequests {
		return true
	}
	if statusCode/100 == 5 {
		return true
	}
	if statusCode == http.StatusBadRequest {
		return false
	}
	if statusCode/100 == 2 {
		return false
	}
	return true
}

func processChannelRelayError(channelID int, err *model.ErrorWithStatusCode) {
	// https://platform.openai.com/docs/guides/error-codes/api-errors
	if monitor.ShouldDisableChannel(&err.Error, err.StatusCode) {
		_ = dbmodel.DisableChannelByID(channelID)
	} else {
		monitor.Emit(channelID, false)
	}
}

func RelayNotImplemented(c *gin.Context) {
	err := model.Error{
		Message: "API not implemented",
		Type:    "aiproxy_error",
		Param:   "",
		Code:    "api_not_implemented",
	}
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": err,
	})
}

func RelayNotFound(c *gin.Context) {
	err := model.Error{
		Message: fmt.Sprintf("Invalid URL (%s %s)", c.Request.Method, c.Request.URL.Path),
		Type:    "invalid_request_error",
		Param:   "",
		Code:    "",
	}
	c.JSON(http.StatusNotFound, gin.H{
		"error": err,
	})
}
