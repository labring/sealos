package controller

import (
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"slices"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common/ctxkey"
	"github.com/labring/sealos/service/aiproxy/common/logger"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/utils"
)

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

	newc.Set(ctxkey.Mode, mode)
	newc.Set(ctxkey.OriginalModel, modelName)
	newc.Set(ctxkey.Channel, channel)
	newc.Set(ctxkey.ChannelTest, true)

	bizErr := relayHelper(newc)
	var respStr string
	if bizErr == nil {
		respStr = w.Body.String()
	} else {
		respStr = bizErr.String()
	}
	meta := newc.MustGet(ctxkey.Meta).(*meta.Meta)

	return channel.UpdateModelTest(
		meta.RequestAt,
		meta.OriginModelName,
		meta.ActualModelName,
		time.Since(meta.RequestAt).Seconds(),
		bizErr == nil,
		respStr,
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

	results := make([]gin.H, 0, len(channel.Models))
	resultsMutex := sync.Mutex{}
	var wg sync.WaitGroup
	semaphore := make(chan struct{}, 5)

	for _, modelName := range channel.Models {
		wg.Add(1)
		semaphore <- struct{}{}

		go func(model string) {
			defer wg.Done()
			defer func() { <-semaphore }()

			ct, err := testSingleModel(channel, model)
			result := gin.H{
				"success": err == nil,
			}
			if err != nil {
				result["message"] = fmt.Sprintf("failed to test channel %s(%d) model %s: %s", channel.Name, channel.ID, model, err.Error())
			} else {
				if !returnSuccess && ct.Success {
					return
				}
				if !successResponseBody && ct.Success {
					ct.Response = ""
				}
				result["data"] = ct
			}
			resultsMutex.Lock()
			results = append(results, result)
			resultsMutex.Unlock()
		}(modelName)
	}

	wg.Wait()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    results,
	})
}

//nolint:goconst
func TestAllChannels(c *gin.Context) {
	channels := model.CacheGetEnabledChannels()

	results := make([]gin.H, 0)
	resultsMutex := sync.Mutex{}
	var wg sync.WaitGroup
	semaphore := make(chan struct{}, 10)

	returnSuccess := c.Query("return_success") == "true"
	successResponseBody := c.Query("success_body") == "true"

	for _, channel := range channels {
		for _, modelName := range channel.Models {
			wg.Add(1)
			semaphore <- struct{}{}

			go func(model string, ch *model.Channel) {
				defer wg.Done()
				defer func() { <-semaphore }()

				ct, err := testSingleModel(ch, model)
				result := gin.H{
					"success": err == nil,
				}
				if err != nil {
					result["message"] = fmt.Sprintf("failed to test channel %s(%d) model %s: %s", ch.Name, ch.ID, model, err.Error())
				} else {
					if !returnSuccess && ct.Success {
						return
					}
					if !successResponseBody && ct.Success {
						ct.Response = ""
					}
					result["data"] = ct
				}
				resultsMutex.Lock()
				results = append(results, result)
				resultsMutex.Unlock()
			}(modelName, channel)
		}
	}

	wg.Wait()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    results,
	})
}
