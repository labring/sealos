package doubaoaudio

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

func GetRequestURL(meta *meta.Meta) (string, error) {
	u := meta.Channel.BaseURL
	switch meta.Mode {
	case relaymode.AudioSpeech:
		return u + "/api/v1/tts/ws_binary", nil
	default:
		return "", fmt.Errorf("unsupported relay mode %d for doubao", meta.Mode)
	}
}

type Adaptor struct{}

const baseURL = "https://openspeech.bytedance.com"

func (a *Adaptor) GetBaseURL() string {
	return baseURL
}

func (a *Adaptor) GetModelList() []*model.ModelConfig {
	return ModelList
}

func (a *Adaptor) GetRequestURL(meta *meta.Meta) (string, error) {
	return GetRequestURL(meta)
}

func (a *Adaptor) ConvertRequest(meta *meta.Meta, req *http.Request) (string, http.Header, io.Reader, error) {
	switch meta.Mode {
	case relaymode.AudioSpeech:
		return ConvertTTSRequest(meta, req)
	default:
		return "", nil, nil, fmt.Errorf("unsupported relay mode %d for doubao", meta.Mode)
	}
}

func (a *Adaptor) SetupRequestHeader(meta *meta.Meta, _ *gin.Context, req *http.Request) error {
	switch meta.Mode {
	case relaymode.AudioSpeech:
		_, token, err := getAppIDAndToken(meta.Channel.Key)
		if err != nil {
			return err
		}
		req.Header.Set("Authorization", "Bearer;"+token)
		return nil
	default:
		return fmt.Errorf("unsupported relay mode %d for doubao", meta.Mode)
	}
}

func (a *Adaptor) DoRequest(meta *meta.Meta, _ *gin.Context, req *http.Request) (*http.Response, error) {
	switch meta.Mode {
	case relaymode.AudioSpeech:
		return TTSDoRequest(meta, req)
	default:
		return nil, fmt.Errorf("unsupported relay mode %d for doubao", meta.Mode)
	}
}

func (a *Adaptor) DoResponse(meta *meta.Meta, c *gin.Context, resp *http.Response) (*relaymodel.Usage, *relaymodel.ErrorWithStatusCode) {
	switch meta.Mode {
	case relaymode.AudioSpeech:
		return TTSDoResponse(meta, c, resp)
	default:
		return nil, openai.ErrorWrapperWithMessage(
			fmt.Sprintf("unsupported relay mode %d for doubao", meta.Mode),
			nil,
			http.StatusBadRequest,
		)
	}
}

func (a *Adaptor) GetChannelName() string {
	return "doubao audio"
}
