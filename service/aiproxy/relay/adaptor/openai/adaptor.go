package openai

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/doubao"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/minimax"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/novita"
	"github.com/labring/sealos/service/aiproxy/relay/channeltype"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

type Adaptor struct {
	meta           *meta.Meta
	contentType    string
	responseFormat string
}

func (a *Adaptor) Init(meta *meta.Meta) {
	a.meta = meta
}

func (a *Adaptor) GetRequestURL(meta *meta.Meta) (string, error) {
	switch meta.ChannelType {
	case channeltype.Azure:
		switch meta.Mode {
		case relaymode.ImagesGenerations:
			// https://learn.microsoft.com/en-us/azure/ai-services/openai/dall-e-quickstart?tabs=dalle3%2Ccommand-line&pivots=rest-api
			// https://{resource_name}.openai.azure.com/openai/deployments/dall-e-3/images/generations?api-version=2024-03-01-preview
			return fmt.Sprintf("%s/openai/deployments/%s/images/generations?api-version=%s", meta.BaseURL, meta.ActualModelName, meta.Config.APIVersion), nil
		case relaymode.AudioTranscription:
			// https://learn.microsoft.com/en-us/azure/ai-services/openai/whisper-quickstart?tabs=command-line#rest-api
			return fmt.Sprintf("%s/openai/deployments/%s/audio/transcriptions?api-version=%s", meta.BaseURL, meta.ActualModelName, meta.Config.APIVersion), nil
		case relaymode.AudioSpeech:
			// https://learn.microsoft.com/en-us/azure/ai-services/openai/text-to-speech-quickstart?tabs=command-line#rest-api
			return fmt.Sprintf("%s/openai/deployments/%s/audio/speech?api-version=%s", meta.BaseURL, meta.ActualModelName, meta.Config.APIVersion), nil
		}

		// https://learn.microsoft.com/en-us/azure/cognitive-services/openai/chatgpt-quickstart?pivots=rest-api&tabs=command-line#rest-api
		requestURL := strings.Split(meta.RequestURLPath, "?")[0]
		requestURL = fmt.Sprintf("%s?api-version=%s", requestURL, meta.Config.APIVersion)
		task := strings.TrimPrefix(requestURL, "/v1/")
		model := strings.ReplaceAll(meta.ActualModelName, ".", "")
		// https://github.com/labring/sealos/service/aiproxy/issues/1191
		// {your endpoint}/openai/deployments/{your azure_model}/chat/completions?api-version={api_version}
		requestURL = fmt.Sprintf("/openai/deployments/%s/%s", model, task)
		return GetFullRequestURL(meta.BaseURL, requestURL, meta.ChannelType), nil
	case channeltype.Minimax:
		return minimax.GetRequestURL(meta)
	case channeltype.Doubao:
		return doubao.GetRequestURL(meta)
	case channeltype.Novita:
		return novita.GetRequestURL(meta)
	default:
		return GetFullRequestURL(meta.BaseURL, meta.RequestURLPath, meta.ChannelType), nil
	}
}

func (a *Adaptor) SetupRequestHeader(c *gin.Context, req *http.Request, meta *meta.Meta) error {
	adaptor.SetupCommonRequestHeader(c, req, meta)
	if meta.ChannelType == channeltype.Azure {
		req.Header.Set("Api-Key", meta.APIKey)
		return nil
	}
	if a.contentType != "" {
		req.Header.Set("Content-Type", a.contentType)
	}
	req.Header.Set("Authorization", "Bearer "+meta.APIKey)
	if meta.ChannelType == channeltype.OpenRouter {
		req.Header.Set("Http-Referer", "https://github.com/labring/sealos/service/aiproxy")
		req.Header.Set("X-Title", "One API")
	}
	return nil
}

func (a *Adaptor) ConvertRequest(_ *gin.Context, _ int, request *model.GeneralOpenAIRequest) (any, error) {
	if request == nil {
		return nil, errors.New("request is nil")
	}
	if request.Stream {
		// always return usage in stream mode
		if request.StreamOptions == nil {
			request.StreamOptions = &model.StreamOptions{}
		}
		request.StreamOptions.IncludeUsage = true
	}
	return request, nil
}

func (a *Adaptor) ConvertTTSRequest(request *model.TextToSpeechRequest) (any, error) {
	if request == nil {
		return nil, errors.New("request is nil")
	}
	if len(request.Input) > 4096 {
		return nil, errors.New("input is too long (over 4096 characters)")
	}
	return request, nil
}

func (a *Adaptor) ConvertSTTRequest(request *http.Request) (io.ReadCloser, error) {
	if request == nil {
		return nil, errors.New("request is nil")
	}

	err := request.ParseMultipartForm(1024 * 1024 * 4)
	if err != nil {
		return nil, err
	}

	multipartBody := &bytes.Buffer{}
	multipartWriter := multipart.NewWriter(multipartBody)

	for key, values := range request.MultipartForm.Value {
		for _, value := range values {
			if key == "model" {
				err = multipartWriter.WriteField(key, a.meta.ActualModelName)
				if err != nil {
					return nil, err
				}
				continue
			}
			if key == "response_format" {
				a.responseFormat = value
			}
			err = multipartWriter.WriteField(key, value)
			if err != nil {
				return nil, err
			}
		}
	}

	for key, files := range request.MultipartForm.File {
		for _, fileHeader := range files {
			file, err := fileHeader.Open()
			if err != nil {
				return nil, err
			}
			w, err := multipartWriter.CreateFormFile(key, fileHeader.Filename)
			if err != nil {
				file.Close()
				return nil, err
			}
			_, err = io.Copy(w, file)
			file.Close()
			if err != nil {
				return nil, err
			}
		}
	}

	multipartWriter.Close()
	a.contentType = multipartWriter.FormDataContentType()
	return io.NopCloser(multipartBody), nil
}

func (a *Adaptor) ConvertImageRequest(request *model.ImageRequest) (any, error) {
	if request == nil {
		return nil, errors.New("request is nil")
	}
	return request, nil
}

func (a *Adaptor) DoRequest(c *gin.Context, meta *meta.Meta, requestBody io.Reader) (*http.Response, error) {
	return adaptor.DoRequestHelper(a, c, meta, requestBody)
}

func (a *Adaptor) DoResponse(c *gin.Context, resp *http.Response, meta *meta.Meta) (usage *model.Usage, err *model.ErrorWithStatusCode) {
	if meta.IsStream {
		var responseText string
		err, responseText, usage = StreamHandler(c, resp, meta.Mode)
		if usage == nil || usage.TotalTokens == 0 {
			usage = ResponseText2Usage(responseText, meta.ActualModelName, meta.PromptTokens)
		}
		if usage.TotalTokens != 0 && usage.PromptTokens == 0 { // some channels don't return prompt tokens & completion tokens
			usage.PromptTokens = meta.PromptTokens
			usage.CompletionTokens = usage.TotalTokens - meta.PromptTokens
		}
		return
	}
	switch meta.Mode {
	case relaymode.ImagesGenerations:
		err, _ = ImageHandler(c, resp)
	case relaymode.AudioTranscription:
		err, usage = STTHandler(c, resp, meta, a.responseFormat)
	case relaymode.AudioSpeech:
		err, usage = TTSHandler(c, resp, meta)
	case relaymode.Rerank:
		err, usage = RerankHandler(c, resp, meta.PromptTokens, meta)
	default:
		err, usage = Handler(c, resp, meta.PromptTokens, meta.ActualModelName)
	}
	return
}

func (a *Adaptor) GetModelList() []string {
	_, modelList := GetCompatibleChannelMeta(a.meta.ChannelType)
	return modelList
}

func (a *Adaptor) GetChannelName() string {
	channelName, _ := GetCompatibleChannelMeta(a.meta.ChannelType)
	return channelName
}
