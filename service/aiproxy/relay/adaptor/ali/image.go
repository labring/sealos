package ali

import (
	"bytes"
	"context"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common/image"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/utils"
	log "github.com/sirupsen/logrus"
)

const MetaResponseFormat = "response_format"

func ConvertImageRequest(meta *meta.Meta, req *http.Request) (string, http.Header, io.Reader, error) {
	request, err := utils.UnmarshalImageRequest(req)
	if err != nil {
		return "", nil, nil, err
	}
	request.Model = meta.ActualModel

	var imageRequest ImageRequest
	imageRequest.Input.Prompt = request.Prompt
	imageRequest.Model = request.Model
	imageRequest.Parameters.Size = strings.ReplaceAll(request.Size, "x", "*")
	imageRequest.Parameters.N = request.N
	imageRequest.ResponseFormat = request.ResponseFormat

	meta.Set(MetaResponseFormat, request.ResponseFormat)

	data, err := json.Marshal(&imageRequest)
	if err != nil {
		return "", nil, nil, err
	}
	return http.MethodPost, http.Header{
		"X-Dashscope-Async": {"enable"},
	}, bytes.NewReader(data), nil
}

func ImageHandler(meta *meta.Meta, c *gin.Context, resp *http.Response) (*model.Usage, *model.ErrorWithStatusCode) {
	log := middleware.GetLogger(c)

	responseFormat := meta.MustGet(MetaResponseFormat).(string)

	var aliTaskResponse TaskResponse
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, openai.ErrorWrapper(err, "read_response_body_failed", http.StatusInternalServerError)
	}
	err = resp.Body.Close()
	if err != nil {
		return nil, openai.ErrorWrapper(err, "close_response_body_failed", http.StatusInternalServerError)
	}
	err = json.Unmarshal(responseBody, &aliTaskResponse)
	if err != nil {
		return nil, openai.ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError)
	}

	if aliTaskResponse.Message != "" {
		log.Error("aliAsyncTask err: " + aliTaskResponse.Message)
		return nil, openai.ErrorWrapper(errors.New(aliTaskResponse.Message), "ali_async_task_failed", http.StatusInternalServerError)
	}

	aliResponse, err := asyncTaskWait(c, aliTaskResponse.Output.TaskID, meta.Channel.Key)
	if err != nil {
		return nil, openai.ErrorWrapper(err, "ali_async_task_wait_failed", http.StatusInternalServerError)
	}

	if aliResponse.Output.TaskStatus != "SUCCEEDED" {
		return nil, &model.ErrorWithStatusCode{
			Error: model.Error{
				Message: aliResponse.Output.Message,
				Type:    "ali_error",
				Param:   "",
				Code:    aliResponse.Output.Code,
			},
			StatusCode: resp.StatusCode,
		}
	}

	fullTextResponse := responseAli2OpenAIImage(c.Request.Context(), aliResponse, responseFormat)
	jsonResponse, err := json.Marshal(fullTextResponse)
	if err != nil {
		return nil, openai.ErrorWrapper(err, "marshal_response_body_failed", http.StatusInternalServerError)
	}
	c.Writer.Header().Set("Content-Type", "application/json")
	c.Writer.WriteHeader(resp.StatusCode)
	_, err = c.Writer.Write(jsonResponse)
	if err != nil {
		log.Warnf("aliImageHandler write response body failed: %v", err)
	}
	return &model.Usage{}, nil
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
		return &aliResponse, err
	}
	defer resp.Body.Close()

	var response TaskResponse
	err = json.NewDecoder(resp.Body).Decode(&response)
	if err != nil {
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
		Created: time.Now().Unix(),
	}

	for _, data := range response.Output.Results {
		var b64Json string
		if responseFormat == "b64_json" {
			// 读取 data.Url 的图片数据并转存到 b64Json
			_, imageData, err := image.GetImageFromURL(ctx, data.URL)
			if err != nil {
				// 处理获取图片数据失败的情况
				log.Error("getImageData Error getting image data: " + err.Error())
				continue
			}

			// 将图片数据转为 Base64 编码的字符串
			b64Json = imageData
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
