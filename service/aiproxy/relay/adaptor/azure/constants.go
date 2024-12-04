package azure

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
)

type Adaptor struct {
	openai.Adaptor
}

// func (a *Adaptor) GetRequestURL(meta *meta.Meta) (string, error) {
// 	switch meta.Mode {
// 	case relaymode.ImagesGenerations:
// 		// https://learn.microsoft.com/en-us/azure/ai-services/openai/dall-e-quickstart?tabs=dalle3%2Ccommand-line&pivots=rest-api
// 		// https://{resource_name}.openai.azure.com/openai/deployments/dall-e-3/images/generations?api-version=2024-03-01-preview
// 		return fmt.Sprintf("%s/openai/deployments/%s/images/generations?api-version=%s", meta.Channel.BaseURL, meta.ActualModelName, meta.Channel.Config.APIVersion), nil
// 	case relaymode.AudioTranscription:
// 		// https://learn.microsoft.com/en-us/azure/ai-services/openai/whisper-quickstart?tabs=command-line#rest-api
// 		return fmt.Sprintf("%s/openai/deployments/%s/audio/transcriptions?api-version=%s", meta.Channel.BaseURL, meta.ActualModelName, meta.Channel.Config.APIVersion), nil
// 	case relaymode.AudioSpeech:
// 		// https://learn.microsoft.com/en-us/azure/ai-services/openai/text-to-speech-quickstart?tabs=command-line#rest-api
// 		return fmt.Sprintf("%s/openai/deployments/%s/audio/speech?api-version=%s", meta.Channel.BaseURL, meta.ActualModelName, meta.Channel.Config.APIVersion), nil
// 	}

// 	// https://learn.microsoft.com/en-us/azure/cognitive-services/openai/chatgpt-quickstart?pivots=rest-api&tabs=command-line#rest-api
// 	requestURL := strings.Split(meta.RequestURLPath, "?")[0]
// 	requestURL = fmt.Sprintf("%s?api-version=%s", requestURL, meta.Channel.Config.APIVersion)
// 	task := strings.TrimPrefix(requestURL, "/v1/")
// 	model := strings.ReplaceAll(meta.ActualModelName, ".", "")
// 	// https://github.com/labring/sealos/service/aiproxy/issues/1191
// 	// {your endpoint}/openai/deployments/{your azure_model}/chat/completions?api-version={api_version}
// 	requestURL = fmt.Sprintf("/openai/deployments/%s/%s", model, task)
// 	return GetFullRequestURL(meta.Channel.BaseURL, requestURL), nil
// }

func GetFullRequestURL(baseURL string, requestURL string) string {
	fullRequestURL := fmt.Sprintf("%s%s", baseURL, requestURL)

	if strings.HasPrefix(baseURL, "https://gateway.ai.cloudflare.com") {
		fullRequestURL = fmt.Sprintf("%s%s", baseURL, strings.TrimPrefix(requestURL, "/v1"))
	}
	return fullRequestURL
}

func (a *Adaptor) SetupRequestHeader(meta *meta.Meta, _ *gin.Context, req *http.Request) error {
	req.Header.Set("Api-Key", meta.Channel.Key)
	return nil
}

func (a *Adaptor) GetChannelName() string {
	return "azure"
}
