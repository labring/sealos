package controller

import (
	"context"
	"errors"
	"fmt"
	"io"
	"math/rand/v2"
	"net/http"
	"net/http/httptest"
	"net/url"
	"slices"
	"strconv"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/render"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/monitor"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
	"github.com/labring/sealos/service/aiproxy/relay/utils"
	log "github.com/sirupsen/logrus"
)

const channelTestRequestID = "channel-test"

// testSingleModel tests a single model in the channel
func testSingleModel(mc *model.ModelCaches, channel *model.Channel, modelName string) (*model.ChannelTest, error) {
	modelConfig, ok := mc.ModelConfig.GetModelConfig(modelName)
	if !ok {
		return nil, errors.New(modelName + " model config not found")
	}
	body, mode, err := utils.BuildRequest(modelConfig)
	if err != nil {
		return nil, err
	}

	w := httptest.NewRecorder()
	newc, _ := gin.CreateTestContext(w)
	newc.Request = &http.Request{
		URL:    &url.URL{},
		Body:   io.NopCloser(body),
		Header: make(http.Header),
	}
	middleware.SetRequestID(newc, channelTestRequestID)

	meta := meta.NewMeta(
		channel,
		mode,
		modelName,
		modelConfig,
		meta.WithRequestID(channelTestRequestID),
		meta.WithChannelTest(true),
	)
	relayController, ok := relayController(mode)
	if !ok {
		return nil, fmt.Errorf("relay mode %d not implemented", mode)
	}
	bizErr := relayController(meta, newc)
	success := bizErr == nil
	var respStr string
	var code int
	if success {
		switch meta.Mode {
		case relaymode.AudioSpeech,
			relaymode.ImagesGenerations:
			respStr = ""
		default:
			respStr = w.Body.String()
		}
		code = w.Code
	} else {
		respStr = bizErr.Error.JSONOrEmpty()
		code = bizErr.StatusCode
	}

	return channel.UpdateModelTest(
		meta.RequestAt,
		meta.OriginModel,
		meta.ActualModel,
		meta.Mode,
		time.Since(meta.RequestAt).Seconds(),
		success,
		respStr,
		code,
	)
}

//nolint:goconst
func TestChannel(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, middleware.APIResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	modelName := c.Param("model")
	if modelName == "" {
		c.JSON(http.StatusOK, middleware.APIResponse{
			Success: false,
			Message: "model is required",
		})
		return
	}

	channel, err := model.LoadChannelByID(id)
	if err != nil {
		c.JSON(http.StatusOK, middleware.APIResponse{
			Success: false,
			Message: "channel not found",
		})
		return
	}

	if !slices.Contains(channel.Models, modelName) {
		c.JSON(http.StatusOK, middleware.APIResponse{
			Success: false,
			Message: "model not supported by channel",
		})
		return
	}

	ct, err := testSingleModel(model.LoadModelCaches(), channel, modelName)
	if err != nil {
		log.Errorf("failed to test channel %s(%d) model %s: %s", channel.Name, channel.ID, modelName, err.Error())
		c.JSON(http.StatusOK, middleware.APIResponse{
			Success: false,
			Message: fmt.Sprintf("failed to test channel %s(%d) model %s: %s", channel.Name, channel.ID, modelName, err.Error()),
		})
		return
	}

	if c.Query("success_body") != "true" && ct.Success {
		ct.Response = ""
	}

	c.JSON(http.StatusOK, middleware.APIResponse{
		Success: true,
		Data:    ct,
	})
}

type testResult struct {
	Data    *model.ChannelTest `json:"data,omitempty"`
	Message string             `json:"message,omitempty"`
	Success bool               `json:"success"`
}

func processTestResult(mc *model.ModelCaches, channel *model.Channel, modelName string, returnSuccess bool, successResponseBody bool) *testResult {
	ct, err := testSingleModel(mc, channel, modelName)

	e := &utils.UnsupportedModelTypeError{}
	if errors.As(err, &e) {
		log.Errorf("model %s not supported test: %s", modelName, err.Error())
		return nil
	}

	result := &testResult{
		Success: err == nil,
	}
	if err != nil {
		result.Message = fmt.Sprintf("failed to test channel %s(%d) model %s: %s", channel.Name, channel.ID, modelName, err.Error())
		return result
	}

	if !ct.Success {
		result.Data = ct
		return result
	}

	if !returnSuccess {
		return nil
	}

	if !successResponseBody {
		ct.Response = ""
	}
	result.Data = ct
	return result
}

//nolint:goconst
//nolint:gosec
func TestChannelModels(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, middleware.APIResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}

	channel, err := model.LoadChannelByID(id)
	if err != nil {
		c.JSON(http.StatusOK, middleware.APIResponse{
			Success: false,
			Message: "channel not found",
		})
		return
	}

	returnSuccess := c.Query("return_success") == "true"
	successResponseBody := c.Query("success_body") == "true"
	isStream := c.Query("stream") == "true"

	if isStream {
		common.SetEventStreamHeaders(c)
	}

	results := make([]*testResult, 0)
	resultsMutex := sync.Mutex{}
	hasError := atomic.Bool{}

	var wg sync.WaitGroup
	semaphore := make(chan struct{}, 5)

	models := slices.Clone(channel.Models)
	rand.Shuffle(len(models), func(i, j int) {
		models[i], models[j] = models[j], models[i]
	})

	mc := model.LoadModelCaches()

	for _, modelName := range models {
		wg.Add(1)
		semaphore <- struct{}{}

		go func(model string) {
			defer wg.Done()
			defer func() { <-semaphore }()

			result := processTestResult(mc, channel, model, returnSuccess, successResponseBody)
			if result == nil {
				return
			}
			if !result.Success || (result.Data != nil && !result.Data.Success) {
				hasError.Store(true)
			}
			resultsMutex.Lock()
			if isStream {
				err := render.ObjectData(c, result)
				if err != nil {
					log.Errorf("failed to render result: %s", err.Error())
				}
			} else {
				results = append(results, result)
			}
			resultsMutex.Unlock()
		}(modelName)
	}

	wg.Wait()

	if !hasError.Load() {
		err := model.ClearLastTestErrorAt(channel.ID)
		if err != nil {
			log.Errorf("failed to clear last test error at for channel %s(%d): %s", channel.Name, channel.ID, err.Error())
		}
	}

	if !isStream {
		c.JSON(http.StatusOK, middleware.APIResponse{
			Success: true,
			Data:    results,
		})
	}
}

//nolint:goconst
//nolint:gosec
func TestAllChannels(c *gin.Context) {
	testDisabled := c.Query("test_disabled") == "true"
	var channels []*model.Channel
	var err error
	if testDisabled {
		channels, err = model.LoadChannels()
	} else {
		channels, err = model.LoadEnabledChannels()
	}
	if err != nil {
		c.JSON(http.StatusOK, middleware.APIResponse{
			Success: false,
			Message: err.Error(),
		})
		return
	}
	returnSuccess := c.Query("return_success") == "true"
	successResponseBody := c.Query("success_body") == "true"
	isStream := c.Query("stream") == "true"

	if isStream {
		common.SetEventStreamHeaders(c)
	}

	results := make([]*testResult, 0)
	resultsMutex := sync.Mutex{}
	hasErrorMap := make(map[int]*atomic.Bool)

	var wg sync.WaitGroup
	semaphore := make(chan struct{}, 5)

	newChannels := slices.Clone(channels)
	rand.Shuffle(len(newChannels), func(i, j int) {
		newChannels[i], newChannels[j] = newChannels[j], newChannels[i]
	})

	mc := model.LoadModelCaches()

	for _, channel := range newChannels {
		channelHasError := &atomic.Bool{}
		hasErrorMap[channel.ID] = channelHasError

		models := slices.Clone(channel.Models)
		rand.Shuffle(len(models), func(i, j int) {
			models[i], models[j] = models[j], models[i]
		})

		for _, modelName := range models {
			wg.Add(1)
			semaphore <- struct{}{}

			go func(model string, ch *model.Channel, hasError *atomic.Bool) {
				defer wg.Done()
				defer func() { <-semaphore }()

				result := processTestResult(mc, ch, model, returnSuccess, successResponseBody)
				if result == nil {
					return
				}
				if !result.Success || (result.Data != nil && !result.Data.Success) {
					hasError.Store(true)
				}
				resultsMutex.Lock()
				if isStream {
					err := render.ObjectData(c, result)
					if err != nil {
						log.Errorf("failed to render result: %s", err.Error())
					}
				} else {
					results = append(results, result)
				}
				resultsMutex.Unlock()
			}(modelName, channel, channelHasError)
		}
	}

	wg.Wait()

	for id, hasError := range hasErrorMap {
		if !hasError.Load() {
			err := model.ClearLastTestErrorAt(id)
			if err != nil {
				log.Errorf("failed to clear last test error at for channel %d: %s", id, err.Error())
			}
		}
	}

	if !isStream {
		c.JSON(http.StatusOK, middleware.APIResponse{
			Success: true,
			Data:    results,
		})
	}
}

func AutoTestBannedModels() {
	log := log.WithFields(log.Fields{
		"auto_test_banned_models": "true",
	})
	channels, err := monitor.GetAllBannedChannels(context.Background())
	if err != nil {
		log.Errorf("failed to get banned channels: %s", err.Error())
		return
	}
	if len(channels) == 0 {
		return
	}

	mc := model.LoadModelCaches()

	for modelName, ids := range channels {
		for _, id := range ids {
			channel, err := model.LoadChannelByID(int(id))
			if err != nil {
				log.Errorf("failed to get channel by model %s: %s", modelName, err.Error())
				continue
			}
			result, err := testSingleModel(mc, channel, modelName)
			if err != nil {
				log.Errorf("failed to test channel %s(%d) model %s: %s", channel.Name, channel.ID, modelName, err.Error())
			}
			if result.Success {
				log.Infof("model %s(%d) test success, unban it", modelName, channel.ID)
				err = monitor.ClearChannelModelErrors(context.Background(), modelName, channel.ID)
				if err != nil {
					log.Errorf("clear channel errors failed: %+v", err)
				}
			} else {
				log.Infof("model %s(%d) test failed", modelName, channel.ID)
			}
		}
	}
}
