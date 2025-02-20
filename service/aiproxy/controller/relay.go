package controller

import (
	"bytes"
	"context"
	"errors"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/config"
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

type RelayController func(*meta.Meta, *gin.Context) *model.ErrorWithStatusCode

func relayController(mode int) (RelayController, bool) {
	var relayController RelayController
	switch mode {
	case relaymode.ImagesGenerations,
		relaymode.Edits:
		relayController = controller.RelayImageHelper
	case relaymode.AudioSpeech:
		relayController = controller.RelayTTSHelper
	case relaymode.AudioTranslation,
		relaymode.AudioTranscription:
		relayController = controller.RelaySTTHelper
	case relaymode.Rerank:
		relayController = controller.RerankHelper
	case relaymode.ChatCompletions,
		relaymode.Embeddings,
		relaymode.Completions,
		relaymode.Moderations:
		relayController = controller.RelayTextHelper
	default:
		return nil, false
	}
	return func(meta *meta.Meta, c *gin.Context) *model.ErrorWithStatusCode {
		log := middleware.GetLogger(c)
		middleware.SetLogFieldsFromMeta(meta, log.Data)
		return relayController(meta, c)
	}, true
}

func RelayHelper(meta *meta.Meta, c *gin.Context, relayController RelayController) (*model.ErrorWithStatusCode, bool) {
	err := relayController(meta, c)
	if err == nil {
		if err := monitor.AddRequest(
			context.Background(),
			meta.OriginModel,
			int64(meta.Channel.ID),
			false,
		); err != nil {
			log.Errorf("add request failed: %+v", err)
		}
		return nil, false
	}
	if shouldRetry(c, err.StatusCode) {
		if err := monitor.AddRequest(
			context.Background(),
			meta.OriginModel,
			int64(meta.Channel.ID),
			true,
		); err != nil {
			log.Errorf("add request failed: %+v", err)
		}
		return err, true
	}
	return err, false
}

func getChannelWithFallback(cache *dbmodel.ModelCaches, model string, failedChannelIDs ...int) (*dbmodel.Channel, error) {
	channel, err := cache.GetRandomSatisfiedChannel(model, failedChannelIDs...)
	if err == nil {
		return channel, nil
	}
	if !errors.Is(err, dbmodel.ErrChannelsExhausted) {
		return nil, err
	}
	return cache.GetRandomSatisfiedChannel(model)
}

func NewRelay(mode int) func(c *gin.Context) {
	relayController, ok := relayController(mode)
	if !ok {
		log.Fatalf("relay mode %d not implemented", mode)
	}
	return func(c *gin.Context) {
		relay(c, mode, relayController)
	}
}

func relay(c *gin.Context, mode int, relayController RelayController) {
	log := middleware.GetLogger(c)

	requestModel := middleware.GetOriginalModel(c)

	ids, err := monitor.GetBannedChannels(c.Request.Context(), requestModel)
	if err != nil {
		log.Errorf("get %s auto banned channels failed: %+v", requestModel, err)
	}

	log.Debugf("%s model banned channels: %+v", requestModel, ids)

	failedChannelIDs := []int{}
	for _, id := range ids {
		failedChannelIDs = append(failedChannelIDs, int(id))
	}

	mc := middleware.GetModelCaches(c)

	channel, err := getChannelWithFallback(mc, requestModel, failedChannelIDs...)
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": &model.Error{
				Message: "The upstream load is saturated, please try again later",
				Code:    "upstream_load_saturated",
				Type:    middleware.ErrorTypeAIPROXY,
			},
		})
		return
	}

	meta := middleware.NewMetaByContext(c, channel, requestModel, mode)
	bizErr, retry := RelayHelper(meta, c, relayController)
	if bizErr == nil {
		return
	}
	failedChannelIDs = append(failedChannelIDs, channel.ID)
	requestID := middleware.GetRequestID(c)
	var retryTimes int64
	if retry {
		retryTimes = config.GetRetryTimes()
	}
	for i := retryTimes; i > 0; i-- {
		newChannel, err := mc.GetRandomSatisfiedChannel(requestModel, failedChannelIDs...)
		if err != nil {
			if errors.Is(err, dbmodel.ErrChannelsNotFound) {
				break
			}
			if !errors.Is(err, dbmodel.ErrChannelsExhausted) {
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
		bizErr, retry = RelayHelper(meta, c, relayController)
		if bizErr == nil {
			return
		}
		if !retry {
			break
		}
		failedChannelIDs = append(failedChannelIDs, newChannel.ID)
	}
	if bizErr != nil {
		bizErr.Error.Message = middleware.MessageWithRequestID(bizErr.Error.Message, requestID)
		c.JSON(bizErr.StatusCode, bizErr)
	}
}

// 仅当是channel错误时，才需要重试，用户请求参数错误时，不需要重试
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
