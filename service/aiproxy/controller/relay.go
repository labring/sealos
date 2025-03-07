package controller

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"math/rand/v2"
	"net/http"
	"slices"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/common/notify"
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

func relayController(mode relaymode.Mode) (RelayController, bool) {
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
	case relaymode.ParsePdf:
		relayController = controller.RelayParsePdfHelper
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
	relayErr := relayController(meta, c)
	if relayErr == nil {
		if _, _, err := monitor.AddRequest(
			context.Background(),
			meta.OriginModel,
			int64(meta.Channel.ID),
			false,
		); err != nil {
			log.Errorf("add request failed: %+v", err)
		}
		return nil, false
	}
	if shouldErrorMonitor(relayErr.StatusCode) {
		beyondThreshold, autoBanned, err := monitor.AddRequest(
			context.Background(),
			meta.OriginModel,
			int64(meta.Channel.ID),
			true,
		)
		if err != nil {
			log.Errorf("add request failed: %+v", err)
		}
		if autoBanned {
			notify.ErrorThrottle(
				fmt.Sprintf("autoBanned:%d:%s", meta.Channel.ID, meta.OriginModel),
				time.Minute,
				fmt.Sprintf("channel[%d] %s(%d) model %s is auto banned",
					meta.Channel.Type, meta.Channel.Name, meta.Channel.ID, meta.OriginModel),
				relayErr.JSONOrEmpty(),
			)
		} else if beyondThreshold {
			notify.WarnThrottle(
				fmt.Sprintf("beyondThreshold:%d:%s", meta.Channel.ID, meta.OriginModel),
				time.Minute,
				fmt.Sprintf("channel[%d] %s(%d) model %s error rate is beyond threshold",
					meta.Channel.Type, meta.Channel.Name, meta.Channel.ID, meta.OriginModel),
				relayErr.JSONOrEmpty(),
			)
		}
	}
	return relayErr, shouldRetry(c, relayErr.StatusCode)
}

func filterChannels(channels []*dbmodel.Channel, ignoreChannel ...int) []*dbmodel.Channel {
	filtered := make([]*dbmodel.Channel, 0)
	for _, channel := range channels {
		if channel.Status != dbmodel.ChannelStatusEnabled {
			continue
		}
		if slices.Contains(ignoreChannel, channel.ID) {
			continue
		}
		filtered = append(filtered, channel)
	}
	return filtered
}

var (
	ErrChannelsNotFound  = errors.New("channels not found")
	ErrChannelsExhausted = errors.New("channels exhausted")
)

func GetRandomChannel(c *dbmodel.ModelCaches, model string, ignoreChannel ...int) (*dbmodel.Channel, error) {
	return getRandomChannel(c.EnabledModel2channels[model], ignoreChannel...)
}

//nolint:gosec
func getRandomChannel(channels []*dbmodel.Channel, ignoreChannel ...int) (*dbmodel.Channel, error) {
	if len(channels) == 0 {
		return nil, ErrChannelsNotFound
	}

	channels = filterChannels(channels, ignoreChannel...)
	if len(channels) == 0 {
		return nil, ErrChannelsExhausted
	}

	if len(channels) == 1 {
		return channels[0], nil
	}

	var totalWeight int32
	for _, ch := range channels {
		totalWeight += ch.GetPriority()
	}

	if totalWeight == 0 {
		return channels[rand.IntN(len(channels))], nil
	}

	r := rand.Int32N(totalWeight)
	for _, ch := range channels {
		r -= ch.GetPriority()
		if r < 0 {
			return ch, nil
		}
	}

	return channels[rand.IntN(len(channels))], nil
}

func getChannelWithFallback(cache *dbmodel.ModelCaches, model string, ignoreChannelIDs ...int) (*dbmodel.Channel, error) {
	channel, err := GetRandomChannel(cache, model, ignoreChannelIDs...)
	if err == nil {
		return channel, nil
	}
	if !errors.Is(err, ErrChannelsExhausted) {
		return nil, err
	}
	return GetRandomChannel(cache, model)
}

func NewRelay(mode relaymode.Mode) func(c *gin.Context) {
	relayController, ok := relayController(mode)
	if !ok {
		log.Fatalf("relay mode %d not implemented", mode)
	}
	return func(c *gin.Context) {
		relay(c, mode, relayController)
	}
}

func relay(c *gin.Context, mode relaymode.Mode, relayController RelayController) {
	log := middleware.GetLogger(c)
	requestModel := middleware.GetOriginalModel(c)

	// Get initial channel
	channel, ignoreChannelIDs, err := getInitialChannel(c, requestModel, log)
	if err != nil || channel == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": &model.Error{
				Message: "the upstream load is saturated, please try again later",
				Code:    "upstream_load_saturated",
				Type:    middleware.ErrorTypeAIPROXY,
			},
		})
		return
	}

	// First attempt
	meta := middleware.NewMetaByContext(c, channel, requestModel, mode)
	bizErr, retry := RelayHelper(meta, c, relayController)
	if handleRelayResult(c, bizErr, retry) {
		return
	}

	// Setup retry state
	retryState := initRetryState(channel, bizErr, ignoreChannelIDs)

	// Retry loop
	retryLoop(c, mode, requestModel, retryState, relayController, log)
}

type retryState struct {
	retryTimes             int64
	lastCanContinueChannel *dbmodel.Channel
	ignoreChannelIDs       []int
	exhausted              bool
	bizErr                 *model.ErrorWithStatusCode
}

func getInitialChannel(c *gin.Context, requestModel string, log *log.Entry) (*dbmodel.Channel, []int, error) {
	ids, err := monitor.GetBannedChannelsWithModel(c.Request.Context(), requestModel)
	if err != nil {
		log.Errorf("get %s auto banned channels failed: %+v", requestModel, err)
	}
	log.Debugf("%s model banned channels: %+v", requestModel, ids)

	ignoreChannelIDs := make([]int, 0, len(ids))
	for _, id := range ids {
		ignoreChannelIDs = append(ignoreChannelIDs, int(id))
	}

	mc := middleware.GetModelCaches(c)
	channel, err := getChannelWithFallback(mc, requestModel, ignoreChannelIDs...)
	if err != nil {
		return nil, nil, err
	}

	return channel, ignoreChannelIDs, nil
}

func handleRelayResult(c *gin.Context, bizErr *model.ErrorWithStatusCode, retry bool) bool {
	if bizErr == nil {
		return true
	}
	if !retry {
		bizErr.Error.Message = middleware.MessageWithRequestID(c, bizErr.Error.Message)
		c.JSON(bizErr.StatusCode, bizErr)
		return true
	}
	return false
}

func initRetryState(channel *dbmodel.Channel, bizErr *model.ErrorWithStatusCode, ignoreChannelIDs []int) *retryState {
	state := &retryState{
		retryTimes:       config.GetRetryTimes(),
		ignoreChannelIDs: ignoreChannelIDs,
		bizErr:           bizErr,
	}

	if !channelCanContinue(bizErr.StatusCode) {
		state.ignoreChannelIDs = append(state.ignoreChannelIDs, channel.ID)
	} else {
		state.lastCanContinueChannel = channel
	}

	return state
}

func retryLoop(c *gin.Context, mode relaymode.Mode, requestModel string, state *retryState, relayController RelayController, log *log.Entry) {
	mc := middleware.GetModelCaches(c)

	for i := 0; i < int(state.retryTimes); i++ {
		newChannel, err := getRetryChannel(mc, requestModel, state)
		if err != nil {
			break
		}

		log.Warnf("using channel %s (type: %d, id: %d) to retry (remain times %d)",
			newChannel.Name,
			newChannel.Type,
			newChannel.ID,
			state.retryTimes-int64(i),
		)

		if !prepareRetry(c, state.bizErr.StatusCode) {
			break
		}

		meta := middleware.NewMetaByContext(c, newChannel, requestModel, mode)
		bizErr, retry := RelayHelper(meta, c, relayController)

		done := handleRetryResult(bizErr, retry, newChannel, state)
		if done {
			break
		}
	}

	if state.bizErr != nil {
		state.bizErr.Error.Message = middleware.MessageWithRequestID(c, state.bizErr.Error.Message)
		c.JSON(state.bizErr.StatusCode, state.bizErr)
	}
}

func getRetryChannel(mc *dbmodel.ModelCaches, requestModel string, state *retryState) (*dbmodel.Channel, error) {
	if state.exhausted {
		return state.lastCanContinueChannel, nil
	}

	newChannel, err := GetRandomChannel(mc, requestModel, state.ignoreChannelIDs...)
	if err != nil {
		if !errors.Is(err, ErrChannelsExhausted) || state.lastCanContinueChannel == nil {
			return nil, err
		}
		state.exhausted = true
		return state.lastCanContinueChannel, nil
	}

	return newChannel, nil
}

func prepareRetry(c *gin.Context, statusCode int) bool {
	requestBody, err := common.GetRequestBody(c.Request)
	if err != nil {
		log.Errorf("get request body failed in prepare retry: %+v", err)
		return false
	}
	c.Request.Body = io.NopCloser(bytes.NewBuffer(requestBody))

	if shouldDelay(statusCode) {
		//nolint:gosec
		time.Sleep(time.Duration(rand.Float64()*float64(time.Second)) + time.Second)
	}

	return true
}

func handleRetryResult(bizErr *model.ErrorWithStatusCode, retry bool, newChannel *dbmodel.Channel, state *retryState) (done bool) {
	state.bizErr = bizErr
	if bizErr == nil || !retry {
		return true
	}

	if state.exhausted {
		if !channelCanContinue(bizErr.StatusCode) {
			return true
		}
	} else {
		if !channelCanContinue(bizErr.StatusCode) {
			state.ignoreChannelIDs = append(state.ignoreChannelIDs, newChannel.ID)
			state.retryTimes++
		} else {
			state.lastCanContinueChannel = newChannel
		}
	}

	return false
}

var shouldRetryStatusCodesMap = map[int]struct{}{
	http.StatusTooManyRequests: {},
	http.StatusUnauthorized:    {},
	http.StatusPaymentRequired: {},
	http.StatusRequestTimeout:  {},
	http.StatusGatewayTimeout:  {},
	http.StatusForbidden:       {},
}

func shouldRetry(_ *gin.Context, statusCode int) bool {
	_, ok := shouldRetryStatusCodesMap[statusCode]
	return ok
}

var channelCanContinueStatusCodesMap = map[int]struct{}{
	http.StatusTooManyRequests: {},
	http.StatusRequestTimeout:  {},
	http.StatusGatewayTimeout:  {},
}

func channelCanContinue(statusCode int) bool {
	_, ok := channelCanContinueStatusCodesMap[statusCode]
	return ok
}

func shouldDelay(statusCode int) bool {
	return statusCode == http.StatusTooManyRequests
}

// 仅当是channel错误时，才需要记录，用户请求参数错误时，不需要记录
func shouldErrorMonitor(statusCode int) bool {
	return statusCode != http.StatusBadRequest
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
