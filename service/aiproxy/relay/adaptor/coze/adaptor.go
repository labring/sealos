package coze

import (
	"bytes"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
	"github.com/labring/sealos/service/aiproxy/relay/utils"
)

type Adaptor struct{}

const baseURL = "https://api.coze.com"

func (a *Adaptor) GetRequestURL(meta *meta.Meta) (string, error) {
	u := meta.Channel.BaseURL
	if u == "" {
		u = baseURL
	}
	return u + "/open_api/v2/chat", nil
}

func getTokenAndUserID(key string) (string, string) {
	split := strings.Split(key, "|")
	if len(split) != 2 {
		return "", ""
	}
	return split[0], split[1]
}

func (a *Adaptor) SetupRequestHeader(meta *meta.Meta, _ *gin.Context, req *http.Request) error {
	token, _ := getTokenAndUserID(meta.Channel.Key)
	req.Header.Set("Authorization", "Bearer "+token)
	return nil
}

func (a *Adaptor) ConvertRequest(meta *meta.Meta, req *http.Request) (http.Header, io.Reader, error) {
	if meta.Mode != relaymode.ChatCompletions {
		return nil, nil, errors.New("coze only support chat completions")
	}
	request, err := utils.UnmarshalGeneralOpenAIRequest(req)
	if err != nil {
		return nil, nil, err
	}
	_, userID := getTokenAndUserID(meta.Channel.Key)
	request.User = userID
	request.Model = meta.ActualModelName
	cozeRequest := Request{
		Stream: request.Stream,
		User:   request.User,
		BotID:  strings.TrimPrefix(meta.ActualModelName, "bot-"),
	}
	for i, message := range request.Messages {
		if i == len(request.Messages)-1 {
			cozeRequest.Query = message.StringContent()
			continue
		}
		cozeMessage := Message{
			Role:    message.Role,
			Content: message.StringContent(),
		}
		cozeRequest.ChatHistory = append(cozeRequest.ChatHistory, cozeMessage)
	}
	data, err := json.Marshal(cozeRequest)
	if err != nil {
		return nil, nil, err
	}
	return nil, bytes.NewReader(data), nil
}

func (a *Adaptor) ConvertImageRequest(request *relaymodel.ImageRequest) (any, error) {
	if request == nil {
		return nil, errors.New("request is nil")
	}
	return request, nil
}

func (a *Adaptor) DoRequest(_ *meta.Meta, _ *gin.Context, req *http.Request) (*http.Response, error) {
	return utils.DoRequest(req)
}

func (a *Adaptor) DoResponse(meta *meta.Meta, c *gin.Context, resp *http.Response) (usage *relaymodel.Usage, err *relaymodel.ErrorWithStatusCode) {
	var responseText *string
	if utils.IsStreamResponse(resp) {
		err, responseText = StreamHandler(c, resp)
	} else {
		err, responseText = Handler(c, resp, meta.PromptTokens, meta.ActualModelName)
	}
	if responseText != nil {
		usage = openai.ResponseText2Usage(*responseText, meta.ActualModelName, meta.PromptTokens)
	} else {
		usage = &relaymodel.Usage{}
	}
	usage.PromptTokens = meta.PromptTokens
	usage.TotalTokens = usage.PromptTokens + usage.CompletionTokens
	return
}

func (a *Adaptor) GetModelList() []*model.ModelConfig {
	return ModelList
}

func (a *Adaptor) GetChannelName() string {
	return "coze"
}
