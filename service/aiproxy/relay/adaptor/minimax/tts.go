package minimax

import (
	"bytes"
	"encoding/hex"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
)

func ConvertTTSRequest(meta *meta.Meta, req *http.Request) (http.Header, io.Reader, error) {
	reqMap := make(map[string]any)
	err := common.UnmarshalBodyReusable(req, &reqMap)
	if err != nil {
		return nil, nil, err
	}

	reqMap["model"] = meta.ActualModelName

	if voice, ok := reqMap["voice"].(string); ok && voice != "" {
		if timberWeights, ok := reqMap["timber_weights"].([]any); !ok || len(timberWeights) == 0 {
			if voiceSetting, exists := reqMap["voice_setting"].(map[string]any); exists {
				if voiceID, hasVoiceID := voiceSetting["voice_id"].(string); !hasVoiceID || voiceID == "" {
					voiceSetting["voice_id"] = voice
				}
			} else {
				reqMap["voice_setting"] = map[string]any{
					"voice_id": voice,
				}
			}
		}
	}
	delete(reqMap, "voice")

	responseFormat, ok := reqMap["response_format"].(string)
	if ok && responseFormat != "" {
		if audioSetting, exists := reqMap["audio_setting"].(map[string]any); exists {
			audioSetting["format"] = responseFormat
		} else {
			reqMap["audio_setting"] = map[string]any{
				"format": responseFormat,
			}
		}
	}
	delete(reqMap, "response_format")

	if responseFormat == "wav" {
		reqMap["stream"] = false
		meta.Set("stream", false)
	} else {
		stream, _ := reqMap["stream"].(bool)
		meta.Set("stream", stream)
	}

	body, err := json.Marshal(reqMap)
	if err != nil {
		return nil, nil, err
	}

	return nil, bytes.NewReader(body), nil
}

type TTSExtraInfo struct {
	UsageCharacters int `json:"usage_characters"`
}

type TTSBaseResp struct {
	StatusMsg  string `json:"status_msg"`
	StatusCode int    `json:"status_code"`
}

type TTSData struct {
	Audio  string `json:"audio"`
	Status int    `json:"status"`
}

type TTSResponse struct {
	BaseResp  *TTSBaseResp `json:"base_resp"`
	Data      TTSData      `json:"data"`
	ExtraInfo TTSExtraInfo `json:"extra_info"`
}

func TTSHandler(meta *meta.Meta, c *gin.Context, resp *http.Response) (*relaymodel.Usage, *relaymodel.ErrorWithStatusCode) {
	if !strings.Contains(resp.Header.Get("Content-Type"), "application/json") && meta.GetBool("stream") {
		return openai.TTSHandler(meta, c, resp)
	}

	defer resp.Body.Close()

	log := middleware.GetLogger(c)

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, openai.ErrorWrapper(err, "TTS_ERROR", http.StatusInternalServerError)
	}

	var result TTSResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, openai.ErrorWrapper(err, "TTS_ERROR", http.StatusInternalServerError)
	}
	if result.BaseResp != nil && result.BaseResp.StatusCode != 0 {
		return nil, openai.ErrorWrapperWithMessage(result.BaseResp.StatusMsg, "TTS_ERROR_"+strconv.Itoa(result.BaseResp.StatusCode), http.StatusInternalServerError)
	}

	audioBytes, err := hex.DecodeString(result.Data.Audio)
	if err != nil {
		return nil, openai.ErrorWrapper(err, "TTS_ERROR", http.StatusInternalServerError)
	}

	_, err = c.Writer.Write(audioBytes)
	if err != nil {
		log.Error("write response body failed: " + err.Error())
	}

	return &relaymodel.Usage{
		PromptTokens: result.ExtraInfo.UsageCharacters,
		TotalTokens:  result.ExtraInfo.UsageCharacters,
	}, nil
}
