package baidu

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
	"github.com/labring/sealos/service/aiproxy/relay/utils"

	"github.com/gin-gonic/gin"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
)

type Adaptor struct{}

const (
	baseURL = "https://aip.baidubce.com"
)

func (a *Adaptor) GetBaseURL() string {
	return baseURL
}

// Get model-specific endpoint using map
var modelEndpointMap = map[string]string{
	"ERNIE-4.0-8K":         "completions_pro",
	"ERNIE-4.0":            "completions_pro",
	"ERNIE-Bot-4":          "completions_pro",
	"ERNIE-Bot":            "completions",
	"ERNIE-Bot-turbo":      "eb-instant",
	"ERNIE-Speed":          "ernie_speed",
	"ERNIE-3.5-8K":         "completions",
	"ERNIE-Bot-8K":         "ernie_bot_8k",
	"ERNIE-Speed-8K":       "ernie_speed",
	"ERNIE-Lite-8K-0922":   "eb-instant",
	"ERNIE-Lite-8K-0308":   "ernie-lite-8k",
	"BLOOMZ-7B":            "bloomz_7b1",
	"bge-large-zh":         "bge_large_zh",
	"bge-large-en":         "bge_large_en",
	"tao-8k":               "tao_8k",
	"bce-reranker-base_v1": "bce_reranker_base",
	"Stable-Diffusion-XL":  "sd_xl",
	"Fuyu-8B":              "fuyu_8b",
}

func (a *Adaptor) GetRequestURL(meta *meta.Meta) (string, error) {
	// Build base URL
	if meta.Channel.BaseURL == "" {
		meta.Channel.BaseURL = baseURL
	}

	// Get API path suffix based on mode
	var pathSuffix string
	switch meta.Mode {
	case relaymode.ChatCompletions:
		pathSuffix = "chat"
	case relaymode.Embeddings:
		pathSuffix = "embeddings"
	case relaymode.Rerank:
		pathSuffix = "reranker"
	case relaymode.ImagesGenerations:
		pathSuffix = "text2image"
	}

	modelEndpoint, ok := modelEndpointMap[meta.ActualModel]
	if !ok {
		modelEndpoint = strings.ToLower(meta.ActualModel)
	}

	// Construct full URL
	fullURL := fmt.Sprintf("%s/rpc/2.0/ai_custom/v1/wenxinworkshop/%s/%s",
		meta.Channel.BaseURL, pathSuffix, modelEndpoint)

	return fullURL, nil
}

func (a *Adaptor) SetupRequestHeader(meta *meta.Meta, _ *gin.Context, req *http.Request) error {
	req.Header.Set("Authorization", "Bearer "+meta.Channel.Key)
	accessToken, err := GetAccessToken(context.Background(), meta.Channel.Key)
	if err != nil {
		return err
	}
	req.URL.RawQuery = "access_token=" + accessToken
	return nil
}

func (a *Adaptor) ConvertRequest(meta *meta.Meta, req *http.Request) (string, http.Header, io.Reader, error) {
	switch meta.Mode {
	case relaymode.Embeddings:
		meta.Set(openai.MetaEmbeddingsPatchInputToSlices, true)
		return openai.ConvertRequest(meta, req)
	case relaymode.Rerank:
		return openai.ConvertRequest(meta, req)
	case relaymode.ImagesGenerations:
		return openai.ConvertRequest(meta, req)
	default:
		return ConvertRequest(meta, req)
	}
}

func (a *Adaptor) DoRequest(_ *meta.Meta, _ *gin.Context, req *http.Request) (*http.Response, error) {
	return utils.DoRequest(req)
}

func (a *Adaptor) DoResponse(meta *meta.Meta, c *gin.Context, resp *http.Response) (usage *relaymodel.Usage, err *relaymodel.ErrorWithStatusCode) {
	switch meta.Mode {
	case relaymode.Embeddings:
		usage, err = EmbeddingsHandler(meta, c, resp)
	case relaymode.Rerank:
		usage, err = RerankHandler(meta, c, resp)
	case relaymode.ImagesGenerations:
		usage, err = ImageHandler(meta, c, resp)
	default:
		if utils.IsStreamResponse(resp) {
			err, usage = StreamHandler(meta, c, resp)
		} else {
			usage, err = Handler(meta, c, resp)
		}
	}
	return
}

func (a *Adaptor) GetModelList() []*model.ModelConfig {
	return ModelList
}

func (a *Adaptor) GetChannelName() string {
	return "baidu"
}
