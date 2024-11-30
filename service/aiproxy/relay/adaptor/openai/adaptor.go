package openai

import (
	"bytes"
	"context"
	"errors"
	"io"
	"mime/multipart"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/client"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
	"github.com/labring/sealos/service/aiproxy/relay/utils"
)

var (
	_ adaptor.Adaptor    = (*Adaptor)(nil)
	_ adaptor.GetBalance = (*Adaptor)(nil)
)

type Adaptor struct{}

const baseURL = "https://api.openai.com"

func (a *Adaptor) GetRequestURL(meta *meta.Meta) (string, error) {
	u := meta.Channel.BaseURL
	if u == "" {
		u = baseURL
	}
	return GetFullRequestURL(u, meta.RequestURLPath), nil
}

func (a *Adaptor) SetupRequestHeader(meta *meta.Meta, c *gin.Context, req *http.Request) error {
	req.Header.Set("Authorization", "Bearer "+meta.Channel.Key)
	return nil
}

func (a *Adaptor) ConvertRequest(meta *meta.Meta, req *http.Request) (http.Header, io.Reader, error) {
	return ConvertRequest(meta, req)
}

func ConvertRequest(meta *meta.Meta, req *http.Request) (http.Header, io.Reader, error) {
	if req == nil {
		return nil, nil, errors.New("request is nil")
	}
	switch meta.Mode {
	case relaymode.Embeddings:
		fallthrough
	case relaymode.ChatCompletions:
		return ConvertTextRequest(meta, req)
	case relaymode.ImagesGenerations:
		return ConvertImageRequest(meta, req)
	case relaymode.AudioTranscription:
		return ConvertSTTRequest(meta, req)
	case relaymode.AudioSpeech:
		return ConvertTTSRequest(meta, req)
	case relaymode.Rerank:
		return ConvertRerankRequest(meta, req)
	default:
		return nil, nil, errors.New("unsupported mode")
	}
}

const DoNotPatchStreamOptionsIncludeUsageMetaKey = "do_not_patch_stream_options_include_usage"

func ConvertTextRequest(meta *meta.Meta, req *http.Request) (http.Header, io.Reader, error) {
	textRequest, err := utils.UnmarshalGeneralOpenAIRequest(req)
	if err != nil {
		return nil, nil, err
	}
	reqMap := make(map[string]any)
	err = common.UnmarshalBodyReusable(req, &reqMap)
	if err != nil {
		return nil, nil, err
	}
	if textRequest.Stream && !meta.GetBool(DoNotPatchStreamOptionsIncludeUsageMetaKey) {
		if reqMap["stream_options"] == nil {
			reqMap["stream_options"] = map[string]any{
				"include_usage": true,
			}
		} else if v, ok := reqMap["stream_options"].(map[string]any); ok {
			v["include_usage"] = true
		} else {
			return nil, nil, errors.New("stream_options is not a map")
		}
	}
	reqMap["model"] = meta.ActualModelName
	jsonData, err := json.Marshal(reqMap)
	if err != nil {
		return nil, nil, err
	}
	return nil, bytes.NewReader(jsonData), nil
}

func ConvertTTSRequest(meta *meta.Meta, req *http.Request) (http.Header, io.Reader, error) {
	textRequest := relaymodel.TextToSpeechRequest{}
	err := common.UnmarshalBodyReusable(req, &textRequest)
	if err != nil {
		return nil, nil, err
	}
	if len(textRequest.Input) > 4096 {
		return nil, nil, errors.New("input is too long (over 4096 characters)")
	}
	reqMap := make(map[string]any)
	err = common.UnmarshalBodyReusable(req, &reqMap)
	if err != nil {
		return nil, nil, err
	}
	reqMap["model"] = meta.ActualModelName
	jsonData, err := json.Marshal(reqMap)
	if err != nil {
		return nil, nil, err
	}
	return nil, bytes.NewReader(jsonData), nil
}

func ConvertSTTRequest(meta *meta.Meta, request *http.Request) (http.Header, io.Reader, error) {
	if request == nil {
		return nil, nil, errors.New("request is nil")
	}

	err := request.ParseMultipartForm(1024 * 1024 * 4)
	if err != nil {
		return nil, nil, err
	}

	multipartBody := &bytes.Buffer{}
	multipartWriter := multipart.NewWriter(multipartBody)

	for key, values := range request.MultipartForm.Value {
		for _, value := range values {
			if key == "model" {
				err = multipartWriter.WriteField(key, meta.ActualModelName)
				if err != nil {
					return nil, nil, err
				}
				continue
			}
			if key == "response_format" {
				continue
			}
			err = multipartWriter.WriteField(key, value)
			if err != nil {
				return nil, nil, err
			}
		}
	}

	for key, files := range request.MultipartForm.File {
		for _, fileHeader := range files {
			file, err := fileHeader.Open()
			if err != nil {
				return nil, nil, err
			}
			w, err := multipartWriter.CreateFormFile(key, fileHeader.Filename)
			if err != nil {
				file.Close()
				return nil, nil, err
			}
			_, err = io.Copy(w, file)
			file.Close()
			if err != nil {
				return nil, nil, err
			}
		}
	}

	multipartWriter.Close()
	ContentType := multipartWriter.FormDataContentType()
	return http.Header{
		"Content-Type": {ContentType},
	}, multipartBody, nil
}

func ConvertImageRequest(meta *meta.Meta, req *http.Request) (http.Header, io.Reader, error) {
	reqMap := make(map[string]any)
	err := common.UnmarshalBodyReusable(req, &reqMap)
	if err != nil {
		return nil, nil, err
	}
	reqMap["model"] = meta.ActualModelName
	jsonData, err := json.Marshal(reqMap)
	if err != nil {
		return nil, nil, err
	}
	return nil, bytes.NewReader(jsonData), nil
}

func ConvertRerankRequest(meta *meta.Meta, req *http.Request) (http.Header, io.Reader, error) {
	reqMap := make(map[string]any)
	err := common.UnmarshalBodyReusable(req, &reqMap)
	if err != nil {
		return nil, nil, err
	}
	reqMap["model"] = meta.ActualModelName
	jsonData, err := json.Marshal(reqMap)
	if err != nil {
		return nil, nil, err
	}
	return nil, bytes.NewReader(jsonData), nil
}

func (a *Adaptor) DoRequest(meta *meta.Meta, c *gin.Context, req *http.Request) (*http.Response, error) {
	return utils.DoRequest(meta, c, req)
}

func (a *Adaptor) DoResponse(meta *meta.Meta, c *gin.Context, resp *http.Response) (usage *relaymodel.Usage, err *relaymodel.ErrorWithStatusCode) {
	return DoResponse(meta, c, resp)
}

func DoResponse(meta *meta.Meta, c *gin.Context, resp *http.Response) (usage *relaymodel.Usage, err *relaymodel.ErrorWithStatusCode) {
	switch meta.Mode {
	case relaymode.ImagesGenerations:
		err, _ = ImageHandler(meta, c, resp)
	case relaymode.AudioTranscription:
		err, usage = STTHandler(meta, c, resp, "")
	case relaymode.AudioSpeech:
		err, usage = TTSHandler(meta, c, resp)
	case relaymode.Rerank:
		err, usage = RerankHandler(meta, c, resp)
	case relaymode.ChatCompletions:
		if utils.IsStreamResponse(resp) {
			err, usage = StreamHandler(meta, c, resp)
		} else {
			err, usage = Handler(meta, c, resp)
		}
	default:
		return nil, ErrorWrapperWithMessage("unsupported mode", "unsupported_mode", http.StatusBadRequest)
	}
	return
}

func (a *Adaptor) GetModelList() []*model.ModelConfig {
	return ModelList
}

func (a *Adaptor) GetChannelName() string {
	return "openai"
}

func (a *Adaptor) GetBalance(channel *model.Channel) (float64, error) {
	u := channel.BaseURL
	if u == "" {
		u = baseURL
	}
	url := u + "/v1/dashboard/billing/subscription"

	req1, err := http.NewRequestWithContext(context.Background(), http.MethodGet, url, nil)
	if err != nil {
		return 0, err
	}
	req1.Header.Set("Authorization", "Bearer "+channel.Key)
	res1, err := client.HTTPClient.Do(req1)
	if err != nil {
		return 0, err
	}
	defer res1.Body.Close()
	subscription := SubscriptionResponse{}
	err = json.NewDecoder(res1.Body).Decode(&subscription)
	if err != nil {
		return 0, err
	}
	now := time.Now()
	startDate := now.Format("2006-01") + "-01"
	endDate := now.Format("2006-01-02")
	if !subscription.HasPaymentMethod {
		startDate = now.AddDate(0, 0, -100).Format("2006-01-02")
	}
	url = u + "/v1/dashboard/billing/usage?start_date=" + startDate + "&end_date=" + endDate
	req2, err := http.NewRequestWithContext(context.Background(), http.MethodGet, url, nil)
	if err != nil {
		return 0, err
	}
	req2.Header.Set("Authorization", "Bearer "+channel.Key)
	res2, err := client.HTTPClient.Do(req2)
	if err != nil {
		return 0, err
	}
	usage := UsageResponse{}
	err = json.NewDecoder(res2.Body).Decode(&usage)
	if err != nil {
		return 0, err
	}
	balance := subscription.HardLimitUSD - usage.TotalUsage/100
	return balance, nil
}
