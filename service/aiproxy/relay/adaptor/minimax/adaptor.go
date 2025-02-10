package minimax

import (
	"fmt"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

type Adaptor struct {
	openai.Adaptor
}

const baseURL = "https://api.minimax.chat/v1"

func (a *Adaptor) GetBaseURL() string {
	return baseURL
}

func (a *Adaptor) GetModelList() []*model.ModelConfig {
	return ModelList
}

func (a *Adaptor) SetupRequestHeader(meta *meta.Meta, _ *gin.Context, req *http.Request) error {
	apiKey, _, err := GetAPIKeyAndGroupID(meta.Channel.Key)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	return nil
}

func (a *Adaptor) GetRequestURL(meta *meta.Meta) (string, error) {
	_, groupID, err := GetAPIKeyAndGroupID(meta.Channel.Key)
	if err != nil {
		return "", err
	}
	switch meta.Mode {
	case relaymode.ChatCompletions:
		return meta.Channel.BaseURL + "/text/chatcompletion_v2", nil
	case relaymode.Embeddings:
		return fmt.Sprintf("%s/embeddings?GroupId=%s", meta.Channel.BaseURL, groupID), nil
	case relaymode.AudioSpeech:
		return fmt.Sprintf("%s/t2a_v2?GroupId=%s", meta.Channel.BaseURL, groupID), nil
	default:
		return a.Adaptor.GetRequestURL(meta)
	}
}

func (a *Adaptor) ConvertRequest(meta *meta.Meta, req *http.Request) (string, http.Header, io.Reader, error) {
	switch meta.Mode {
	case relaymode.ChatCompletions:
		meta.Set(openai.DoNotPatchStreamOptionsIncludeUsageMetaKey, true)
		return a.Adaptor.ConvertRequest(meta, req)
	case relaymode.AudioSpeech:
		return ConvertTTSRequest(meta, req)
	default:
		return a.Adaptor.ConvertRequest(meta, req)
	}
}

func (a *Adaptor) DoResponse(meta *meta.Meta, c *gin.Context, resp *http.Response) (usage *relaymodel.Usage, err *relaymodel.ErrorWithStatusCode) {
	switch meta.Mode {
	case relaymode.AudioSpeech:
		return TTSHandler(meta, c, resp)
	default:
		return a.Adaptor.DoResponse(meta, c, resp)
	}
}

func (a *Adaptor) GetChannelName() string {
	return "minimax"
}
