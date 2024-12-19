package controller

import (
	"bytes"
	"errors"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/common/ctxkey"
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

	requestModel := c.MustGet(string(ctxkey.OriginalModel)).(string)
	channel, err := dbmodel.CacheGetRandomSatisfiedChannel(requestModel)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": &model.Error{
				Message: "The upstream load of the current group is saturated, please try again later",
				Code:    "upstream_load_saturated",
				Type:    middleware.ErrorTypeAIPROXY,
			},
		})
		return
	}

	meta := middleware.NewMetaByContext(c, channel)
	bizErr := relayHelper(meta, c)
	if bizErr == nil {
		return
	}
	failedChannelIDs := []int{channel.ID}
	requestID := c.GetString(ctxkey.RequestID)
	var retryTimes int64
	if shouldRetry(c, bizErr.StatusCode) {
		retryTimes = config.GetRetryTimes()
	}
	for i := retryTimes; i > 0; i-- {
		newChannel, err := dbmodel.CacheGetRandomSatisfiedChannel(meta.OriginModelName, failedChannelIDs...)
		if err != nil {
			if !errors.Is(err, dbmodel.ErrChannelsExhausted) {
				log.Errorf("get random satisfied channel failed: %+v", err)
				break
			}
			if len(failedChannelIDs) != 1 {
				break
			}
			newChannel = channel
		}
		log.Warnf("using channel %s(%d) to retry (remain times %d)", newChannel.Name, newChannel.ID, i)
		requestBody, err := common.GetRequestBody(c.Request)
		if err != nil {
			log.Errorf("GetRequestBody failed: %+v", err)
			break
		}
		c.Request.Body = io.NopCloser(bytes.NewBuffer(requestBody))
		meta.Reset(newChannel)
		bizErr = relayHelper(meta, c)
		if bizErr == nil {
			return
		}
		failedChannelIDs = append(failedChannelIDs, newChannel.ID)
	}
	if bizErr != nil {
		message := bizErr.Message
		if bizErr.StatusCode == http.StatusTooManyRequests {
			message = "The upstream load of the current group is saturated, please try again later"
		}
		c.JSON(bizErr.StatusCode, gin.H{
			"error": &model.Error{
				Message: middleware.MessageWithRequestID(message, requestID),
				Code:    bizErr.Code,
				Param:   bizErr.Param,
				Type:    bizErr.Type,
			},
		})
	}
}

func shouldRetry(_ *gin.Context, statusCode int) bool {
	if statusCode == http.StatusTooManyRequests ||
		statusCode == http.StatusGatewayTimeout ||
		statusCode == http.StatusForbidden {
		return true
	}
	return false
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
