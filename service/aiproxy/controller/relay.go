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
	"github.com/labring/sealos/service/aiproxy/monitor"
	"github.com/labring/sealos/service/aiproxy/relay/controller"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
	log "github.com/sirupsen/logrus"
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

func RelayHelper(meta *meta.Meta, c *gin.Context) *model.ErrorWithStatusCode {
	err := relayHelper(meta, c)
	if err := monitor.AddRequest(c.Request.Context(), meta.OriginModelName, int64(meta.Channel.ID), err != nil); err != nil {
		log.Errorf("add request failed: %+v", err)
	}
	return err
}

func Relay(c *gin.Context) {
	log := middleware.GetLogger(c)

	requestModel := c.MustGet(string(ctxkey.OriginalModel)).(string)

	ids, err := monitor.GetBannedChannels(c.Request.Context(), requestModel)
	if err != nil {
		log.Errorf("get %s auto banned channels failed: %+v", requestModel, err)
	}

	failedChannelIDs := []int{}
	for _, id := range ids {
		failedChannelIDs = append(failedChannelIDs, int(id))
	}

	channel, err := dbmodel.CacheGetRandomSatisfiedChannel(requestModel, failedChannelIDs...)
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
	bizErr := RelayHelper(meta, c)
	if bizErr == nil {
		return
	}
	failedChannelIDs = append(failedChannelIDs, channel.ID)
	requestID := c.GetString(ctxkey.RequestID)
	var retryTimes int64
	if shouldRetry(c, bizErr.StatusCode) {
		retryTimes = config.GetRetryTimes()
	}
	for i := retryTimes; i > 0; i-- {
		newChannel, err := dbmodel.CacheGetRandomSatisfiedChannel(requestModel, failedChannelIDs...)
		if err != nil {
			if errors.Is(err, dbmodel.ErrChannelsNotFound) {
				break
			}
			if !errors.Is(err, dbmodel.ErrChannelsExhausted) {
				log.Errorf("get random satisfied channel failed: %+v", err)
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
		bizErr = RelayHelper(meta, c)
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
