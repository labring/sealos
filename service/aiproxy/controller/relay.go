package controller

import (
	"bytes"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/common/helper"
	"github.com/labring/sealos/service/aiproxy/middleware"
	dbmodel "github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/controller"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

// https://platform.openai.com/docs/api-reference/chat

func relayHelper(meta *meta.Meta, c *gin.Context) *model.ErrorWithStatusCode {
	log := middleware.GetLogger(c)
	middleware.SetLogFieldsFromMeta(meta, log.Data)
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
		return
	}
	lastFailedChannelID := meta.Channel.ID
	requestID := c.GetString(string(helper.RequestIDKey))
	retryTimes := config.GetRetryTimes()
	if !shouldRetry(c, bizErr.StatusCode) {
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
	}
	if bizErr != nil {
		message := bizErr.Message
		if bizErr.StatusCode == http.StatusTooManyRequests {
			message = "The upstream load of the current group is saturated, please try again later"
		}
		c.JSON(bizErr.StatusCode, gin.H{
			"error": &model.Error{
				Message: helper.MessageWithRequestID(message, requestID),
				Code:    bizErr.Code,
				Param:   bizErr.Param,
				Type:    bizErr.Type,
			},
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

func RelayNotImplemented(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": &model.Error{
			Message: "API not implemented",
			Type:    middleware.ErrorTypeAIPROXY,
			Param:   "",
			Code:    "api_not_implemented",
		},
	})
}
