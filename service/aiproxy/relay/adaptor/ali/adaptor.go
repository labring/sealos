package ali

import (
	"bytes"
	"errors"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common"
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

func (a *Adaptor) GetRequestURL(meta *meta.Meta) (string, error) {
	u := meta.Channel.BaseURL
	if u == "" {
		u = baseURL
	}
	switch meta.Mode {
	case relaymode.Embeddings:
		return u + "/api/v1/services/embeddings/text-embedding/text-embedding", nil
	case relaymode.ImagesGenerations:
		return u + "/api/v1/services/aigc/text2image/image-synthesis", nil
	case relaymode.ChatCompletions:
		return u + "/compatible-mode/v1/chat/completions", nil
	case relaymode.Rerank:
		return u + "/api/v1/services/rerank/text-rerank/text-rerank", nil
	default:
		return "", errors.New("unsupported mode")
	}
}

func (a *Adaptor) SetupRequestHeader(meta *meta.Meta, c *gin.Context, req *http.Request) error {
	req.Header.Set("Authorization", "Bearer "+meta.Channel.Key)

	if meta.Channel.Config.Plugin != "" {
		req.Header.Set("X-Dashscope-Plugin", meta.Channel.Config.Plugin)
	}
	return nil
}

func (a *Adaptor) ConvertRequest(meta *meta.Meta, req *http.Request) (http.Header, io.Reader, error) {
	switch meta.Mode {
	case relaymode.ImagesGenerations:
		request, err := utils.UnmarshalImageRequest(req)
		if err != nil {
			return nil, nil, err
		}
		request.Model = meta.ActualModelName
		converted := ConvertImageRequest(request)
		data, err := json.Marshal(converted)
		if err != nil {
			return nil, nil, err
		}
		return http.Header{
			"X-Dashscope-Async": {"enable"},
		}, bytes.NewReader(data), nil
	case relaymode.Rerank:
		return ConvertRerankRequest(meta, req)
	case relaymode.ChatCompletions:
		return openai.ConvertRequest(meta, req)
	default:
		return nil, nil, errors.New("unsupported mode")
	}
}

func ConvertRerankRequest(meta *meta.Meta, req *http.Request) (http.Header, io.Reader, error) {
	reqMap := make(map[string]any)
	err := common.UnmarshalBodyReusable(req, &reqMap)
	if err != nil {
		return nil, nil, err
	}
	reqMap["model"] = meta.ActualModelName
	reqMap["input"] = map[string]any{
		"query":     reqMap["query"],
		"documents": reqMap["documents"],
	}
	delete(reqMap, "query")
	delete(reqMap, "documents")
	parameters := make(map[string]any)
	for k, v := range reqMap {
		if k == "model" || k == "input" {
			continue
		}
		parameters[k] = v
		delete(reqMap, k)
	}
	reqMap["parameters"] = parameters
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
	switch meta.Mode {
	case relaymode.Embeddings:
		err, usage = EmbeddingHandler(meta, c, resp)
	case relaymode.ImagesGenerations:
		err, usage = ImageHandler(meta, c, resp)
	case relaymode.ChatCompletions:
		usage, err = openai.DoResponse(meta, c, resp)
	case relaymode.Rerank:
		usage, err = RerankHandler(meta, c, resp)
	default:
		return nil, openai.ErrorWrapperWithMessage("unsupported mode", "unsupported_mode", http.StatusBadRequest)
	}
	return
}

func (a *Adaptor) GetModelList() []*model.ModelConfig {
	return ModelList
}

func (a *Adaptor) GetChannelName() string {
	return "ali"
}
