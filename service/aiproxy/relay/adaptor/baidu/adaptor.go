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
	baseURL   = "https://aip.baidubce.com"
	baseURLV2 = "https://qianfan.baidubce.com"
)

// func IsV2(modelName string) bool {
// 	return strings.HasPrefix(strings.ToLower(modelName), "ernie-")
// }

// func (a *Adaptor) getRequestURLV2(_ *meta.Meta) string {
// 	return baseURLV2 + "/v2/chat/completions"
// }

// var v2ModelMap = map[string]string{
// 	"ERNIE-4.0-8K-Latest":        "ernie-4.0-8k-latest",
// 	"ERNIE-4.0-8K-Preview":       "ernie-4.0-8k-preview",
// 	"ERNIE-4.0-8K":               "ernie-4.0-8k",
// 	"ERNIE-4.0-Turbo-8K-Latest":  "ernie-4.0-turbo-8k-latest",
// 	"ERNIE-4.0-Turbo-8K-Preview": "ernie-4.0-turbo-8k-preview",
// 	"ERNIE-4.0-Turbo-8K":         "ernie-4.0-turbo-8k",
// 	"ERNIE-4.0-Turbo-128K":       "ernie-4.0-turbo-128k",
// 	"ERNIE-3.5-8K-Preview":       "ernie-3.5-8k-preview",
// 	"ERNIE-3.5-8K":               "ernie-3.5-8k",
// 	"ERNIE-3.5-128K":             "ernie-3.5-128k",
// 	"ERNIE-Speed-8K":             "ernie-speed-8k",
// 	"ERNIE-Speed-128K":           "ernie-speed-128k",
// 	"ERNIE-Speed-Pro-128K":       "ernie-speed-pro-128k",
// 	"ERNIE-Lite-8K":              "ernie-lite-8k",
// 	"ERNIE-Lite-Pro-128K":        "ernie-lite-pro-128k",
// 	"ERNIE-Tiny-8K":              "ernie-tiny-8k",
// 	"ERNIE-Character-8K":         "ernie-char-8k",
// 	"ERNIE-Character-Fiction-8K": "ernie-char-fiction-8k",
// 	"ERNIE-Novel-8K":             "ernie-novel-8k",
// }

func (a *Adaptor) GetRequestURL(meta *meta.Meta) (string, error) {
	// if IsV2(meta.ActualModelName) {
	// 	return a.getRequestURLV2(meta), nil
	// }

	// https://cloud.baidu.com/doc/WENXINWORKSHOP/s/clntwmv7t
	var suffix string
	switch meta.Mode {
	case relaymode.ChatCompletions:
		suffix = "chat/"
	case relaymode.Embeddings:
		suffix = "embeddings/"
	case relaymode.Rerank:
		suffix = "reranker/"
	}

	switch meta.ActualModelName {
	case "ERNIE-4.0-8K", "ERNIE-4.0", "ERNIE-Bot-4":
		suffix += "completions_pro"
	case "ERNIE-Bot":
		suffix += "completions"
	case "ERNIE-Bot-turbo":
		suffix += "eb-instant"
	case "ERNIE-Speed":
		suffix += "ernie_speed"
	case "ERNIE-3.5-8K":
		suffix += "completions"
	case "ERNIE-Bot-8K":
		suffix += "ernie_bot_8k"
	case "ERNIE-Speed-8K":
		suffix += "ernie_speed"
	case "ERNIE-Lite-8K-0922":
		suffix += "eb-instant"
	case "ERNIE-Lite-8K-0308":
		suffix += "ernie-lite-8k"
	case "BLOOMZ-7B":
		suffix += "bloomz_7b1"
	case "bge-large-zh":
		suffix += "bge_large_zh"
	case "bge-large-en":
		suffix += "bge_large_en"
	case "tao-8k":
		suffix += "tao_8k"
	case "bce-reranker-base_v1":
		suffix += "bce_reranker_base"
	default:
		suffix += strings.ToLower(meta.ActualModelName)
	}
	u := meta.Channel.BaseURL
	if u == "" {
		u = baseURL
	}
	fullRequestURL := fmt.Sprintf("%s/rpc/2.0/ai_custom/v1/wenxinworkshop/%s", u, suffix)
	return fullRequestURL, nil
}

func (a *Adaptor) SetupRequestHeader(meta *meta.Meta, _ *gin.Context, req *http.Request) error {
	// if IsV2(meta.ActualModelName) {
	// 	token, err := GetBearerToken(meta.APIKey)
	// 	if err != nil {
	// 		return err
	// 	}
	// 	req.Header.Set("Authorization", "Bearer "+token.Token)
	// 	return nil
	// }
	req.Header.Set("Authorization", "Bearer "+meta.Channel.Key)
	accessToken, err := GetAccessToken(context.Background(), meta.Channel.Key)
	if err != nil {
		return err
	}
	req.URL.RawQuery = "access_token=" + accessToken
	return nil
}

func (a *Adaptor) ConvertRequest(meta *meta.Meta, req *http.Request) (http.Header, io.Reader, error) {
	switch meta.Mode {
	case relaymode.Embeddings:
		meta.Set(openai.MetaEmbeddingsPatchInputToSlices, true)
		return openai.ConvertRequest(meta, req)
	case relaymode.Rerank:
		return openai.ConvertRequest(meta, req)
	default:
		// if IsV2(meta.ActualModelName) {
		// 	return openai.ConvertRequest(meta, req)
		// }
		return ConvertRequest(meta, req)
	}
}

func (a *Adaptor) DoRequest(meta *meta.Meta, c *gin.Context, req *http.Request) (*http.Response, error) {
	return utils.DoRequest(meta, c, req)
}

func (a *Adaptor) DoResponse(meta *meta.Meta, c *gin.Context, resp *http.Response) (usage *relaymodel.Usage, err *relaymodel.ErrorWithStatusCode) {
	switch meta.Mode {
	case relaymode.Embeddings:
		usage, err = EmbeddingsHandler(meta, c, resp)
	case relaymode.Rerank:
		usage, err = RerankHandler(meta, c, resp)
	default:
		// if IsV2(meta.ActualModelName) {
		// 	usage, err = openai.DoResponse(meta, c, resp)
		// 	return
		// }
		if utils.IsStreamResponse(resp) {
			err, usage = StreamHandler(c, resp)
		} else {
			usage, err = Handler(c, resp)
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
