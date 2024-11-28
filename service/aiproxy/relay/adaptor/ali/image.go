package ali

import (
	"context"
	"encoding/base64"
	"errors"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common/helper"
	"github.com/labring/sealos/service/aiproxy/common/logger"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/model"
)

func ImageHandler(c *gin.Context, resp *http.Response, apiKey string) (*model.ErrorWithStatusCode, *model.Usage) {
	responseFormat := c.GetString("response_format")

	var aliTaskResponse TaskResponse
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return openai.ErrorWrapper(err, "read_response_body_failed", http.StatusInternalServerError), nil
	}
	err = resp.Body.Close()
	if err != nil {
		return openai.ErrorWrapper(err, "close_response_body_failed", http.StatusInternalServerError), nil
	}
	err = json.Unmarshal(responseBody, &aliTaskResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError), nil
	}

	if aliTaskResponse.Message != "" {
		logger.Error(c, "aliAsyncTask err: "+aliTaskResponse.Message)
		return openai.ErrorWrapper(errors.New(aliTaskResponse.Message), "ali_async_task_failed", http.StatusInternalServerError), nil
	}

	aliResponse, err := asyncTaskWait(c, aliTaskResponse.Output.TaskID, apiKey)
	if err != nil {
		return openai.ErrorWrapper(err, "ali_async_task_wait_failed", http.StatusInternalServerError), nil
	}

	if aliResponse.Output.TaskStatus != "SUCCEEDED" {
		return &model.ErrorWithStatusCode{
			Error: model.Error{
				Message: aliResponse.Output.Message,
				Type:    "ali_error",
				Param:   "",
				Code:    aliResponse.Output.Code,
			},
			StatusCode: resp.StatusCode,
		}, nil
	}

	fullTextResponse := responseAli2OpenAIImage(c.Request.Context(), aliResponse, responseFormat)
	jsonResponse, err := json.Marshal(fullTextResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "marshal_response_body_failed", http.StatusInternalServerError), nil
	}
	c.Writer.Header().Set("Content-Type", "application/json")
	c.Writer.WriteHeader(resp.StatusCode)
	_, _ = c.Writer.Write(jsonResponse)
	return nil, nil
}

func asyncTask(ctx context.Context, taskID string, key string) (*TaskResponse, error) {
	url := "https://dashscope.aliyuncs.com/api/v1/tasks/" + taskID

	var aliResponse TaskResponse

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return &aliResponse, err
	}

	req.Header.Set("Authorization", "Bearer "+key)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		logger.Error(ctx, "aliAsyncTask client.Do err: "+err.Error())
		return &aliResponse, err
	}
	defer resp.Body.Close()

	var response TaskResponse
	err = json.NewDecoder(resp.Body).Decode(&response)
	if err != nil {
		logger.Error(ctx, "aliAsyncTask NewDecoder err: "+err.Error())
		return &aliResponse, err
	}

	return &response, nil
}

func asyncTaskWait(ctx context.Context, taskID string, key string) (*TaskResponse, error) {
	waitSeconds := 2
	step := 0
	maxStep := 20

	for {
		step++
		rsp, err := asyncTask(ctx, taskID, key)
		if err != nil {
			return nil, err
		}

		if rsp.Output.TaskStatus == "" {
			return rsp, nil
		}

		switch rsp.Output.TaskStatus {
		case "FAILED":
			fallthrough
		case "CANCELED":
			fallthrough
		case "SUCCEEDED":
			fallthrough
		case "UNKNOWN":
			return rsp, nil
		}
		if step >= maxStep {
			break
		}
		time.Sleep(time.Duration(waitSeconds) * time.Second)
	}

	return nil, errors.New("aliAsyncTaskWait timeout")
}

func responseAli2OpenAIImage(ctx context.Context, response *TaskResponse, responseFormat string) *openai.ImageResponse {
	imageResponse := openai.ImageResponse{
		Created: helper.GetTimestamp(),
	}

	for _, data := range response.Output.Results {
		var b64Json string
		if responseFormat == "b64_json" {
			// 读取 data.Url 的图片数据并转存到 b64Json
			imageData, err := getImageData(ctx, data.URL)
			if err != nil {
				// 处理获取图片数据失败的情况
				logger.Error(ctx, "getImageData Error getting image data: "+err.Error())
				continue
			}

			// 将图片数据转为 Base64 编码的字符串
			b64Json = Base64Encode(imageData)
		} else {
			// 如果 responseFormat 不是 "b64_json"，则直接使用 data.B64Image
			b64Json = data.B64Image
		}

		imageResponse.Data = append(imageResponse.Data, &openai.ImageData{
			URL:           data.URL,
			B64Json:       b64Json,
			RevisedPrompt: "",
		})
	}
	return &imageResponse
}

func getImageData(ctx context.Context, url string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	response, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	imageData, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, err
	}

	return imageData, nil
}

func Base64Encode(data []byte) string {
	b64Json := base64.StdEncoding.EncodeToString(data)
	return b64Json
}
