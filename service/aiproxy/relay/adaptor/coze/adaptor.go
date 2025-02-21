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

func (a *Adaptor) GetBaseURL() string {
	return baseURL
}

func (a *Adaptor) GetRequestURL(meta *meta.Meta) (string, error) {
	return meta.Channel.BaseURL + "/open_api/v2/chat", nil
}

func (a *Adaptor) SetupRequestHeader(meta *meta.Meta, _ *gin.Context, req *http.Request) error {
	token, _, err := getTokenAndUserID(meta.Channel.Key)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	return nil
}

func (a *Adaptor) ConvertRequest(meta *meta.Meta, req *http.Request) (string, http.Header, io.Reader, error) {
	if meta.Mode != relaymode.ChatCompletions {
		return "", nil, nil, errors.New("coze only support chat completions")
	}
	request, err := utils.UnmarshalGeneralOpenAIRequest(req)
	if err != nil {
		return "", nil, nil, err
	}
	_, userID, err := getTokenAndUserID(meta.Channel.Key)
	if err != nil {
		return "", nil, nil, err
	}
	request.User = userID
	request.Model = meta.ActualModel
	cozeRequest := Request{
		Stream: request.Stream,
		User:   request.User,
		BotID:  strings.TrimPrefix(meta.ActualModel, "bot-"),
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
		return "", nil, nil, err
	}
	return http.MethodPost, nil, bytes.NewReader(data), nil
}

func (a *Adaptor) DoRequest(_ *meta.Meta, _ *gin.Context, req *http.Request) (*http.Response, error) {
	return utils.DoRequest(req)
}

func (a *Adaptor) DoResponse(meta *meta.Meta, c *gin.Context, resp *http.Response) (usage *relaymodel.Usage, err *relaymodel.ErrorWithStatusCode) {
	var responseText *string
	if utils.IsStreamResponse(resp) {
		err, responseText = StreamHandler(meta, c, resp)
	} else {
		err, responseText = Handler(meta, c, resp)
	}
	if responseText != nil {
		usage = openai.ResponseText2Usage(*responseText, meta.ActualModel, meta.InputTokens)
	} else {
		usage = &relaymodel.Usage{}
	}
	usage.PromptTokens = meta.InputTokens
	usage.TotalTokens = usage.PromptTokens + usage.CompletionTokens
	return
}

func (a *Adaptor) GetModelList() []*model.ModelConfig {
	return ModelList
}

func (a *Adaptor) GetChannelName() string {
	return "coze"
}
