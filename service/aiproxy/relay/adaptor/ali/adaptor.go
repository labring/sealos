package ali

import (
	"bytes"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
	"github.com/labring/sealos/service/aiproxy/relay/utils"
)

// https://help.aliyun.com/zh/dashscope/developer-reference/api-details

type Adaptor struct{}

const baseURL = "https://dashscope.aliyuncs.com"

func (a *Adaptor) GetBaseURL() string {
	return baseURL
}

func (a *Adaptor) GetRequestURL(meta *meta.Meta) (string, error) {
	u := meta.Channel.BaseURL
	if u == "" {
		u = baseURL
	}
	switch meta.Mode {
	case relaymode.ImagesGenerations:
		return u + "/api/v1/services/aigc/text2image/image-synthesis", nil
	case relaymode.ChatCompletions:
		return u + "/compatible-mode/v1/chat/completions", nil
	case relaymode.Completions:
		return u + "/compatible-mode/v1/completions", nil
	case relaymode.Embeddings:
		return u + "/compatible-mode/v1/embeddings", nil
	case relaymode.AudioSpeech, relaymode.AudioTranscription:
		return u + "/api-ws/v1/inference", nil
	case relaymode.Rerank:
		return u + "/api/v1/services/rerank/text-rerank/text-rerank", nil
	default:
		return "", errors.New("unsupported mode")
	}
}

func (a *Adaptor) SetupRequestHeader(meta *meta.Meta, _ *gin.Context, req *http.Request) error {
	req.Header.Set("Authorization", "Bearer "+meta.Channel.Key)

	// req.Header.Set("X-Dashscope-Plugin", meta.Channel.Config.Plugin)
	return nil
}

func (a *Adaptor) ConvertRequest(meta *meta.Meta, req *http.Request) (string, http.Header, io.Reader, error) {
	switch meta.Mode {
	case relaymode.ImagesGenerations:
		return ConvertImageRequest(meta, req)
	case relaymode.Rerank:
		return ConvertRerankRequest(meta, req)
	case relaymode.ChatCompletions, relaymode.Completions, relaymode.Embeddings:
		return openai.ConvertRequest(meta, req)
	case relaymode.AudioSpeech:
		return ConvertTTSRequest(meta, req)
	case relaymode.AudioTranscription:
		return ConvertSTTRequest(meta, req)
	default:
		return "", nil, nil, errors.New("unsupported convert request mode")
	}
}

func ignoreTest(meta *meta.Meta) bool {
	return meta.IsChannelTest &&
		(strings.Contains(meta.ActualModel, "-ocr") ||
			strings.HasPrefix(meta.ActualModel, "qwen-mt-"))
}

func (a *Adaptor) DoRequest(meta *meta.Meta, _ *gin.Context, req *http.Request) (*http.Response, error) {
	if ignoreTest(meta) {
		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(bytes.NewReader(nil)),
		}, nil
	}
	switch meta.Mode {
	case relaymode.AudioSpeech:
		return TTSDoRequest(meta, req)
	case relaymode.AudioTranscription:
		return STTDoRequest(meta, req)
	case relaymode.ChatCompletions:
		fallthrough
	default:
		return utils.DoRequest(req)
	}
}

func (a *Adaptor) DoResponse(meta *meta.Meta, c *gin.Context, resp *http.Response) (usage *relaymodel.Usage, err *relaymodel.ErrorWithStatusCode) {
	if ignoreTest(meta) {
		return &relaymodel.Usage{}, nil
	}
	switch meta.Mode {
	case relaymode.ImagesGenerations:
		usage, err = ImageHandler(meta, c, resp)
	case relaymode.ChatCompletions, relaymode.Completions, relaymode.Embeddings:
		usage, err = openai.DoResponse(meta, c, resp)
	case relaymode.Rerank:
		usage, err = RerankHandler(meta, c, resp)
	case relaymode.AudioSpeech:
		usage, err = TTSDoResponse(meta, c, resp)
	case relaymode.AudioTranscription:
		usage, err = STTDoResponse(meta, c, resp)
	default:
		return nil, openai.ErrorWrapperWithMessage("unsupported response mode", "unsupported_mode", http.StatusBadRequest)
	}
	return
}

func (a *Adaptor) GetModelList() []*model.ModelConfig {
	return ModelList
}

func (a *Adaptor) GetChannelName() string {
	return "ali"
}
