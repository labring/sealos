package controller

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/common/ctxkey"
	"github.com/labring/sealos/service/aiproxy/common/helper"
	"github.com/labring/sealos/service/aiproxy/common/logger"
	"github.com/labring/sealos/service/aiproxy/middleware"
	dbmodel "github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/monitor"
	"github.com/labring/sealos/service/aiproxy/relay/controller"
	"github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

// https://platform.openai.com/docs/api-reference/chat

func relayHelper(c *gin.Context, relayMode int) *model.ErrorWithStatusCode {
	var err *model.ErrorWithStatusCode
	switch relayMode {
	case relaymode.ImagesGenerations:
		err = controller.RelayImageHelper(c, relayMode)
	case relaymode.AudioSpeech:
		fallthrough
	case relaymode.AudioTranslation:
		fallthrough
	case relaymode.AudioTranscription:
		err = controller.RelayAudioHelper(c, relayMode)
	default:
		err = controller.RelayTextHelper(c)
	}
	return err
}

func Relay(c *gin.Context) {
	ctx := c.Request.Context()
	relayMode := relaymode.GetByPath(c.Request.URL.Path)
	if config.DebugEnabled {
		requestBody, _ := common.GetRequestBody(c)
		logger.Debugf(ctx, "request body: %s", requestBody)
	}
	channelID := c.GetInt(ctxkey.ChannelID)
	bizErr := relayHelper(c, relayMode)
	if bizErr == nil {
		monitor.Emit(channelID, true)
		return
	}
	lastFailedChannelID := channelID
	group := c.GetString(ctxkey.Group)
	originalModel := c.GetString(ctxkey.OriginalModel)
	go processChannelRelayError(ctx, group, channelID, bizErr)
	requestID := c.GetString(string(helper.RequestIDKey))
	retryTimes := config.GetRetryTimes()
	if !shouldRetry(c, bizErr.StatusCode) {
		logger.Errorf(ctx, "relay error happen, status code is %d, won't retry in this case", bizErr.StatusCode)
		retryTimes = 0
	}
	for i := retryTimes; i > 0; i-- {
		channel, err := dbmodel.CacheGetRandomSatisfiedChannel(originalModel)
		if err != nil {
			logger.Errorf(ctx, "get random satisfied channel failed: %+v", err)
			break
		}
		logger.Infof(ctx, "using channel #%d to retry (remain times %d)", channel.ID, i)
		if channel.ID == lastFailedChannelID {
			continue
		}
		middleware.SetupContextForSelectedChannel(c, channel, originalModel)
		requestBody, err := common.GetRequestBody(c)
		if err != nil {
			logger.Errorf(ctx, "GetRequestBody failed: %+v", err)
			break
		}
		c.Request.Body = io.NopCloser(bytes.NewBuffer(requestBody))
		bizErr = relayHelper(c, relayMode)
		if bizErr == nil {
			return
		}
		channelID := c.GetInt(ctxkey.ChannelID)
		lastFailedChannelID = channelID
		// BUG: bizErr is in race condition
		go processChannelRelayError(ctx, group, channelID, bizErr)
	}
	if bizErr != nil {
		if bizErr.StatusCode == http.StatusTooManyRequests {
			bizErr.Error.Message = "The upstream load of the current group is saturated, please try again later"
		}

		// BUG: bizErr is in race condition
		bizErr.Error.Message = helper.MessageWithRequestID(bizErr.Error.Message, requestID)
		c.JSON(bizErr.StatusCode, gin.H{
			"error": bizErr.Error,
		})
	}
}

func shouldRetry(c *gin.Context, statusCode int) bool {
	if _, ok := c.Get(ctxkey.SpecificChannelID); ok {
		return false
	}
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

func processChannelRelayError(ctx context.Context, group string, channelID int, err *model.ErrorWithStatusCode) {
	logger.Errorf(ctx, "relay error (channel id %d, group: %s): %s", channelID, group, err)
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
