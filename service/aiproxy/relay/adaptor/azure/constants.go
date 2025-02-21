package azure

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

type Adaptor struct {
	openai.Adaptor
}

func (a *Adaptor) GetBaseURL() string {
	return "https://{resource_name}.openai.azure.com"
}

func (a *Adaptor) GetRequestURL(meta *meta.Meta) (string, error) {
	_, apiVersion, err := getTokenAndAPIVersion(meta.Channel.Key)
	if err != nil {
		return "", err
	}
	model := strings.ReplaceAll(meta.ActualModel, ".", "")
	switch meta.Mode {
	case relaymode.ImagesGenerations:
		// https://learn.microsoft.com/en-us/azure/ai-services/openai/dall-e-quickstart?tabs=dalle3%2Ccommand-line&pivots=rest-api
		// https://{resource_name}.openai.azure.com/openai/deployments/dall-e-3/images/generations?api-version=2024-03-01-preview
		return fmt.Sprintf("%s/openai/deployments/%s/images/generations?api-version=%s", meta.Channel.BaseURL, model, apiVersion), nil
	case relaymode.AudioTranscription:
		// https://learn.microsoft.com/en-us/azure/ai-services/openai/whisper-quickstart?tabs=command-line#rest-api
		return fmt.Sprintf("%s/openai/deployments/%s/audio/transcriptions?api-version=%s", meta.Channel.BaseURL, model, apiVersion), nil
	case relaymode.AudioSpeech:
		// https://learn.microsoft.com/en-us/azure/ai-services/openai/text-to-speech-quickstart?tabs=command-line#rest-api
		return fmt.Sprintf("%s/openai/deployments/%s/audio/speech?api-version=%s", meta.Channel.BaseURL, model, apiVersion), nil
	case relaymode.ChatCompletions:
		// https://learn.microsoft.com/en-us/azure/cognitive-services/openai/chatgpt-quickstart?pivots=rest-api&tabs=command-line#rest-api
		return fmt.Sprintf("%s/openai/deployments/%s/chat/completions?api-version=%s", meta.Channel.BaseURL, model, apiVersion), nil
	default:
		return "", fmt.Errorf("unsupported mode: %d", meta.Mode)
	}
}

func (a *Adaptor) SetupRequestHeader(meta *meta.Meta, _ *gin.Context, req *http.Request) error {
	token, _, err := getTokenAndAPIVersion(meta.Channel.Key)
	if err != nil {
		return err
	}
	req.Header.Set("Api-Key", token)
	return nil
}

func (a *Adaptor) GetChannelName() string {
	return "azure"
}
