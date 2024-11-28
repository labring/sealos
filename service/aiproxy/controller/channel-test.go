package controller

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"slices"
	"strconv"
	"sync"
	"time"

	json "github.com/json-iterator/go"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/common/ctxkey"
	"github.com/labring/sealos/service/aiproxy/common/logger"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/monitor"
	relay "github.com/labring/sealos/service/aiproxy/relay"
	"github.com/labring/sealos/service/aiproxy/relay/channeltype"
	"github.com/labring/sealos/service/aiproxy/relay/controller"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

func buildTestRequest(model string) *relaymodel.GeneralOpenAIRequest {
	testRequest := &relaymodel.GeneralOpenAIRequest{
		MaxTokens: 2,
		Model:     model,
	}
	testMessage := relaymodel.Message{
		Role:    "user",
		Content: "hi",
	}
	testRequest.Messages = append(testRequest.Messages, testMessage)
	return testRequest
}

func testChannel(channel *model.Channel, request *relaymodel.GeneralOpenAIRequest) (openaiErr *relaymodel.Error, err error) {
	if len(channel.Models) == 0 {
		channel.Models = config.GetDefaultChannelModels()[channel.Type]
		if len(channel.Models) == 0 {
			return nil, errors.New("no models")
		}
	}
	modelName := request.Model
	if modelName == "" {
		modelName = channel.Models[0]
	} else if !slices.Contains(channel.Models, modelName) {
		return nil, fmt.Errorf("model %s not supported", modelName)
	}
	if v, ok := channel.ModelMapping[modelName]; ok {
		modelName = v
	}
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = &http.Request{
		Method: http.MethodPost,
		URL:    &url.URL{Path: "/v1/chat/completions"},
		Body:   nil,
		Header: make(http.Header),
	}
	c.Request.Header.Set("Authorization", "Bearer "+channel.Key)
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set(ctxkey.Channel, channel.Type)
	c.Set(ctxkey.BaseURL, channel.BaseURL)
	c.Set(ctxkey.Config, channel.Config)
	middleware.SetupContextForSelectedChannel(c, channel, "")
	meta := meta.GetByContext(c)
	apiType := channeltype.ToAPIType(channel.Type)
	adaptor := relay.GetAdaptor(apiType)
	if adaptor == nil {
		return nil, fmt.Errorf("invalid api type: %d, adaptor is nil", apiType)
	}
	adaptor.Init(meta)
	meta.OriginModelName, meta.ActualModelName = request.Model, modelName
	request.Model = modelName
	convertedRequest, err := adaptor.ConvertRequest(c, relaymode.ChatCompletions, request)
	if err != nil {
		return nil, err
	}
	jsonData, err := json.Marshal(convertedRequest)
	if err != nil {
		return nil, err
	}
	logger.SysLogf("testing channel #%d, request: \n%s", channel.ID, jsonData)
	requestBody := bytes.NewBuffer(jsonData)
	c.Request.Body = io.NopCloser(requestBody)
	resp, err := adaptor.DoRequest(c, meta, requestBody)
	if err != nil {
		return nil, err
	}
	if resp != nil && resp.StatusCode != http.StatusOK {
		err := controller.RelayErrorHandler(resp, meta.Mode)
		return &err.Error, errors.New(err.Error.Message)
	}
	usage, respErr := adaptor.DoResponse(c, resp, meta)
	if respErr != nil {
		return &respErr.Error, errors.New(respErr.Error.Message)
	}
	if usage == nil {
		return nil, errors.New("usage is nil")
	}
	result := w.Result()
	// print result.Body
	respBody, err := io.ReadAll(result.Body)
	if err != nil {
		return nil, err
	}
	logger.SysLogf("testing channel #%d, response: \n%s", channel.ID, respBody)
	return nil, nil
}

func TestChannel(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	channel, err := model.GetChannelByID(id, false)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	model := c.Query("model")
	testRequest := buildTestRequest(model)
	tik := time.Now()
	_, err = testChannel(channel, testRequest)
	tok := time.Now()
	milliseconds := tok.Sub(tik).Milliseconds()
	if err != nil {
		milliseconds = 0
	}
	go channel.UpdateResponseTime(milliseconds)
	consumedTime := float64(milliseconds) / 1000.0
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
			"time":    consumedTime,
			"model":   model,
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"time":    consumedTime,
		"model":   model,
	})
}

var (
	testAllChannelsLock    sync.Mutex
	testAllChannelsRunning = false
)

func testChannels(onlyDisabled bool) error {
	testAllChannelsLock.Lock()
	if testAllChannelsRunning {
		testAllChannelsLock.Unlock()
		return errors.New("测试已在运行中")
	}
	testAllChannelsRunning = true
	testAllChannelsLock.Unlock()
	channels, err := model.GetAllChannels(onlyDisabled, false)
	if err != nil {
		return err
	}
	go func() {
		for _, channel := range channels {
			isChannelEnabled := channel.Status == model.ChannelStatusEnabled
			tik := time.Now()
			testRequest := buildTestRequest("")
			openaiErr, err := testChannel(channel, testRequest)
			tok := time.Now()
			milliseconds := tok.Sub(tik).Milliseconds()
			if isChannelEnabled && monitor.ShouldDisableChannel(openaiErr, -1) {
				_ = model.DisableChannelByID(channel.ID)
			}
			if !isChannelEnabled && monitor.ShouldEnableChannel(err, openaiErr) {
				_ = model.EnableChannelByID(channel.ID)
			}
			channel.UpdateResponseTime(milliseconds)
			time.Sleep(time.Second * 1)
		}
		testAllChannelsLock.Lock()
		testAllChannelsRunning = false
		testAllChannelsLock.Unlock()
	}()
	return nil
}

func TestChannels(c *gin.Context) {
	onlyDisabled := c.Query("only_disabled") == "true"
	err := testChannels(onlyDisabled)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
	})
}

func AutomaticallyTestChannels(frequency int) {
	for {
		time.Sleep(time.Duration(frequency) * time.Minute)
		logger.SysLog("testing all channels")
		err := testChannels(false)
		if err != nil {
			logger.SysLog("testing all channels failed: " + err.Error())
		}
		logger.SysLog("channel test finished")
	}
}
