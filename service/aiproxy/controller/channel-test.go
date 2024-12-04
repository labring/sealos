package controller

import (
	"context"
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
	"github.com/labring/sealos/service/aiproxy/common/helper"
	"github.com/labring/sealos/service/aiproxy/common/logger"
	"github.com/labring/sealos/service/aiproxy/common/render"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/utils"
)

const channelTestRequestID = "channel-test"

// testSingleModel tests a single model in the channel
func testSingleModel(channel *model.Channel, modelName string) (*model.ChannelTest, error) {
	body, mode, err := utils.BuildRequest(modelName)
	if err != nil {
		return nil, err
	}

	w := httptest.NewRecorder()
	newc, _ := gin.CreateTestContext(w)
	newc.Request = &http.Request{
		Method: http.MethodPost,
		URL:    &url.URL{Path: utils.BuildModeDefaultPath(mode)},
		Body:   io.NopCloser(body),
		Header: make(http.Header),
	}
	reqIDContext := context.WithValue(newc.Request.Context(), helper.RequestIDKey, channelTestRequestID)
	newc.Request = newc.Request.WithContext(reqIDContext)

	meta := meta.NewMeta(
		channel,
		mode,
		modelName,
		meta.WithRequestID(channelTestRequestID),
		meta.WithChannelTest(true),
	)
	bizErr := relayHelper(meta, newc)
	var respStr string
	var code int
	if bizErr == nil {
		respStr = w.Body.String()
		code = w.Code
	} else {
		respStr = bizErr.String()
		code = bizErr.StatusCode
	}

	return channel.UpdateModelTest(
		meta.RequestAt,
		meta.OriginModelName,
		meta.ActualModelName,
		meta.Mode,
		time.Since(meta.RequestAt).Seconds(),
		bizErr == nil,
		respStr,
		code,
	)
}

//nolint:goconst
func TestChannel(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	modelName := c.Param("model")
	if modelName == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "model is required",
		})
		return
	}

	channel, ok := model.CacheGetEnabledChannelByID(id)
	if !ok {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "channel not found",
		})
		return
	}

	if !slices.Contains(channel.Models, modelName) {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "model not supported by channel",
		})
		return
	}

	ct, err := testSingleModel(channel, modelName)
	if err != nil {
		logger.SysErrorf("failed to test channel %s(%d) model %s: %s", channel.Name, channel.ID, modelName, err.Error())
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": fmt.Sprintf("failed to test channel %s(%d) model %s: %s", channel.Name, channel.ID, modelName, err.Error()),
		})
		return
	}

	if c.Query("success_body") != "true" && ct.Success {
		ct.Response = ""
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    ct,
	})
}

type testResult struct {
	Data    *model.ChannelTest `json:"data,omitempty"`
	Message string             `json:"message,omitempty"`
	Success bool               `json:"success"`
}

func processTestResult(channel *model.Channel, modelName string, returnSuccess bool, successResponseBody bool) *testResult {
	ct, err := testSingleModel(channel, modelName)
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
func TestChannelModels(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}

	channel, ok := model.CacheGetEnabledChannelByID(id)
	if !ok {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "channel not found",
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
	resultsChan := make(chan *testResult, len(channel.Models))
	hasError := atomic.Bool{}

	var wg sync.WaitGroup
	semaphore := make(chan struct{}, 5)

	models := slices.Clone(channel.Models)
	rand.Shuffle(len(models), func(i, j int) {
		models[i], models[j] = models[j], models[i]
	})

	for _, modelName := range models {
		wg.Add(1)
		semaphore <- struct{}{}

		go func(model string) {
			defer wg.Done()
			defer func() { <-semaphore }()

			result := processTestResult(channel, model, returnSuccess, successResponseBody)
			if result == nil {
				return
			}
			if !result.Success || (result.Data != nil && !result.Data.Success) {
				hasError.Store(true)
			}
			resultsChan <- result
		}(modelName)
	}

	go func() {
		wg.Wait()
		close(resultsChan)
	}()

	for result := range resultsChan {
		if isStream {
			err := render.ObjectData(c, result)
			if err != nil {
				logger.SysErrorf("failed to render result: %s", err.Error())
			}
		} else {
			results = append(results, result)
		}
	}

	if !hasError.Load() {
		err := model.ClearLastTestErrorAt(channel.ID)
		if err != nil {
			logger.SysErrorf("failed to clear last test error at for channel %s(%d): %s", channel.Name, channel.ID, err.Error())
		}
	}

	if !isStream {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    results,
		})
	}
}

//nolint:goconst
func TestAllChannels(c *gin.Context) {
	channels := model.CacheGetEnabledChannels()
	returnSuccess := c.Query("return_success") == "true"
	successResponseBody := c.Query("success_body") == "true"
	isStream := c.Query("stream") == "true"

	if isStream {
		common.SetEventStreamHeaders(c)
	}

	results := make([]*testResult, 0)
	resultsChan := make(chan *testResult, len(channels)*10)
	hasErrorMap := make(map[int]*atomic.Bool)

	var wg sync.WaitGroup
	semaphore := make(chan struct{}, 5)

	newChannels := slices.Clone(channels)
	rand.Shuffle(len(newChannels), func(i, j int) {
		newChannels[i], newChannels[j] = newChannels[j], newChannels[i]
	})

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

				result := processTestResult(ch, model, returnSuccess, successResponseBody)
				if result == nil {
					return
				}
				if !result.Success || (result.Data != nil && !result.Data.Success) {
					hasError.Store(true)
				}
				resultsChan <- result
			}(modelName, channel, channelHasError)
		}
	}

	go func() {
		wg.Wait()
		close(resultsChan)
	}()

	for result := range resultsChan {
		if isStream {
			err := render.ObjectData(c, result)
			if err != nil {
				logger.SysErrorf("failed to render result: %s", err.Error())
			}
		} else {
			results = append(results, result)
		}
	}

	for id, hasError := range hasErrorMap {
		if !hasError.Load() {
			err := model.ClearLastTestErrorAt(id)
			if err != nil {
				logger.SysErrorf("failed to clear last test error at for channel %d: %s", id, err.Error())
			}
		}
	}

	if !isStream {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    results,
		})
	}
}
