package openai

import (
	"bytes"
	"errors"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
	"github.com/labring/sealos/service/aiproxy/relay/utils"
)

var _ adaptor.Adaptor = (*Adaptor)(nil)

type Adaptor struct{}

const baseURL = "https://api.openai.com/v1"

func (a *Adaptor) GetBaseURL() string {
	return baseURL
}

func (a *Adaptor) GetRequestURL(meta *meta.Meta) (string, error) {
	u := meta.Channel.BaseURL

	var path string
	switch meta.Mode {
	case relaymode.ChatCompletions:
		path = "/chat/completions"
	case relaymode.Completions:
		path = "/completions"
	case relaymode.Embeddings:
		path = "/embeddings"
	case relaymode.Moderations:
		path = "/moderations"
	case relaymode.ImagesGenerations:
		path = "/images/generations"
	case relaymode.Edits:
		path = "/edits"
	case relaymode.AudioSpeech:
		path = "/audio/speech"
	case relaymode.AudioTranscription:
		path = "/audio/transcriptions"
	case relaymode.AudioTranslation:
		path = "/audio/translations"
	case relaymode.Rerank:
		path = "/rerank"
	default:
		return "", errors.New("unsupported mode")
	}

	return u + path, nil
}

func (a *Adaptor) SetupRequestHeader(meta *meta.Meta, _ *gin.Context, req *http.Request) error {
	req.Header.Set("Authorization", "Bearer "+meta.Channel.Key)
	return nil
}

func (a *Adaptor) ConvertRequest(meta *meta.Meta, req *http.Request) (string, http.Header, io.Reader, error) {
	return ConvertRequest(meta, req)
}

func ConvertRequest(meta *meta.Meta, req *http.Request) (string, http.Header, io.Reader, error) {
	if req == nil {
		return "", nil, nil, errors.New("request is nil")
	}
	switch meta.Mode {
	case relaymode.Moderations:
		meta.Set(MetaEmbeddingsPatchInputToSlices, true)
		return ConvertEmbeddingsRequest(meta, req)
	case relaymode.Embeddings, relaymode.Completions:
		return ConvertEmbeddingsRequest(meta, req)
	case relaymode.ChatCompletions:
		return ConvertTextRequest(meta, req, meta.GetBool(DoNotPatchStreamOptionsIncludeUsageMetaKey))
	case relaymode.ImagesGenerations:
		return ConvertImageRequest(meta, req)
	case relaymode.AudioTranscription, relaymode.AudioTranslation:
		return ConvertSTTRequest(meta, req)
	case relaymode.AudioSpeech:
		return ConvertTTSRequest(meta, req)
	case relaymode.Rerank:
		return ConvertRerankRequest(meta, req)
	default:
		return "", nil, nil, errors.New("unsupported convert request mode")
	}
}

func DoResponse(meta *meta.Meta, c *gin.Context, resp *http.Response) (usage *relaymodel.Usage, err *relaymodel.ErrorWithStatusCode) {
	switch meta.Mode {
	case relaymode.ImagesGenerations:
		usage, err = ImageHandler(meta, c, resp)
	case relaymode.AudioTranscription, relaymode.AudioTranslation:
		usage, err = STTHandler(meta, c, resp)
	case relaymode.AudioSpeech:
		usage, err = TTSHandler(meta, c, resp)
	case relaymode.Rerank:
		usage, err = RerankHandler(meta, c, resp)
	case relaymode.Moderations:
		usage, err = ModerationsHandler(meta, c, resp)
	case relaymode.Embeddings, relaymode.Completions:
		fallthrough
	case relaymode.ChatCompletions:
		if utils.IsStreamResponse(resp) {
			usage, err = StreamHandler(meta, c, resp)
		} else {
			usage, err = Handler(meta, c, resp)
		}
	default:
		return nil, ErrorWrapperWithMessage("unsupported response mode", "unsupported_mode", http.StatusBadRequest)
	}
	return
}

const DoNotPatchStreamOptionsIncludeUsageMetaKey = "do_not_patch_stream_options_include_usage"

func ConvertTextRequest(meta *meta.Meta, req *http.Request, doNotPatchStreamOptionsIncludeUsage bool) (string, http.Header, io.Reader, error) {
	reqMap := make(map[string]any)
	err := common.UnmarshalBodyReusable(req, &reqMap)
	if err != nil {
		return "", nil, nil, err
	}

	if !doNotPatchStreamOptionsIncludeUsage {
		if err := patchStreamOptions(reqMap); err != nil {
			return "", nil, nil, err
		}
	}

	reqMap["model"] = meta.ActualModel
	jsonData, err := json.Marshal(reqMap)
	if err != nil {
		return "", nil, nil, err
	}
	return http.MethodPost, nil, bytes.NewReader(jsonData), nil
}

func patchStreamOptions(reqMap map[string]any) error {
	stream, ok := reqMap["stream"]
	if !ok {
		return nil
	}

	streamBool, ok := stream.(bool)
	if !ok {
		return errors.New("stream is not a boolean")
	}

	if !streamBool {
		return nil
	}

	streamOptions, ok := reqMap["stream_options"].(map[string]any)
	if !ok {
		if reqMap["stream_options"] != nil {
			return errors.New("stream_options is not a map")
		}
		reqMap["stream_options"] = map[string]any{
			"include_usage": true,
		}
		return nil
	}

	streamOptions["include_usage"] = true
	return nil
}

const MetaResponseFormat = "response_format"

func (a *Adaptor) DoRequest(_ *meta.Meta, _ *gin.Context, req *http.Request) (*http.Response, error) {
	return utils.DoRequest(req)
}

func (a *Adaptor) DoResponse(meta *meta.Meta, c *gin.Context, resp *http.Response) (usage *relaymodel.Usage, err *relaymodel.ErrorWithStatusCode) {
	return DoResponse(meta, c, resp)
}

func (a *Adaptor) GetModelList() []*model.ModelConfig {
	return ModelList
}

func (a *Adaptor) GetChannelName() string {
	return "openai"
}
