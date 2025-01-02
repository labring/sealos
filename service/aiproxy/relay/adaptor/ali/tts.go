package ali

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/utils"
)

type TTSMessage struct {
	Header  TTSHeader  `json:"header"`
	Payload TTSPayload `json:"payload"`
}

type TTSHeader struct {
	Attributes   map[string]any `json:"attributes"`
	Action       string         `json:"action,omitempty"`
	TaskID       string         `json:"task_id"`
	Streaming    string         `json:"streaming,omitempty"`
	Event        string         `json:"event,omitempty"`
	ErrorCode    string         `json:"error_code,omitempty"`
	ErrorMessage string         `json:"error_message,omitempty"`
}

type TTSPayload struct {
	Model      string        `json:"model,omitempty"`
	TaskGroup  string        `json:"task_group,omitempty"`
	Task       string        `json:"task,omitempty"`
	Function   string        `json:"function,omitempty"`
	Input      TTSInput      `json:"input,omitempty"`
	Output     TTSOutput     `json:"output,omitempty"`
	Parameters TTSParameters `json:"parameters,omitempty"`
	Usage      TTSUsage      `json:"usage,omitempty"`
}

type TTSInput struct {
	Text string `json:"text"`
}

type TTSParameters struct {
	TextType                string  `json:"text_type"`
	Format                  string  `json:"format"`
	SampleRate              int     `json:"sample_rate,omitempty"`
	Volume                  int     `json:"volume"`
	Rate                    float64 `json:"rate"`
	Pitch                   float64 `json:"pitch"`
	WordTimestampEnabled    bool    `json:"word_timestamp_enabled"`
	PhonemeTimestampEnabled bool    `json:"phoneme_timestamp_enabled"`
}

type TTSOutput struct {
	Sentence TTSSentence `json:"sentence"`
}

type TTSSentence struct {
	Words     []TTSWord `json:"words"`
	BeginTime int       `json:"begin_time"`
	EndTime   int       `json:"end_time"`
}

type TTSWord struct {
	Text      string       `json:"text"`
	Phonemes  []TTSPhoneme `json:"phonemes"`
	BeginTime int          `json:"begin_time"`
	EndTime   int          `json:"end_time"`
}

type TTSPhoneme struct {
	Text      string `json:"text"`
	BeginTime int    `json:"begin_time"`
	EndTime   int    `json:"end_time"`
	Tone      int    `json:"tone"`
}

type TTSUsage struct {
	Characters int `json:"characters"`
}

var ttsSupportedFormat = map[string]struct{}{
	"pcm": {},
	"wav": {},
	"mp3": {},
}

func ConvertTTSRequest(meta *meta.Meta, req *http.Request) (string, http.Header, io.Reader, error) {
	request, err := utils.UnmarshalTTSRequest(req)
	if err != nil {
		return "", nil, nil, err
	}
	reqMap, err := utils.UnmarshalMap(req)
	if err != nil {
		return "", nil, nil, err
	}
	var sampleRate int
	sampleRateI, ok := reqMap["sample_rate"].(float64)
	if ok {
		sampleRate = int(sampleRateI)
	}
	request.Model = meta.ActualModel

	if strings.HasPrefix(request.Model, "sambert-v") {
		voice := request.Voice
		if voice == "" {
			voice = "zhinan"
		}
		request.Model = fmt.Sprintf("sambert-%s-v%s", voice, strings.TrimPrefix(request.Model, "sambert-v"))
	}

	ttsRequest := TTSMessage{
		Header: TTSHeader{
			Action:    "run-task",
			Streaming: "out",
			TaskID:    uuid.New().String(),
		},
		Payload: TTSPayload{
			Model:     request.Model,
			Task:      "tts",
			TaskGroup: "audio",
			Function:  "SpeechSynthesizer",
			Input: TTSInput{
				Text: request.Input,
			},
			Parameters: TTSParameters{
				TextType:                "PlainText",
				Format:                  "wav",
				Volume:                  50,
				SampleRate:              sampleRate,
				Rate:                    request.Speed,
				Pitch:                   1.0,
				WordTimestampEnabled:    true,
				PhonemeTimestampEnabled: true,
			},
		},
	}

	if _, ok := ttsSupportedFormat[request.ResponseFormat]; ok {
		ttsRequest.Payload.Parameters.Format = request.ResponseFormat
	}

	if ttsRequest.Payload.Parameters.Rate < 0.5 {
		ttsRequest.Payload.Parameters.Rate = 0.5
	} else if ttsRequest.Payload.Parameters.Rate > 2 {
		ttsRequest.Payload.Parameters.Rate = 2
	}

	data, err := json.Marshal(ttsRequest)
	if err != nil {
		return "", nil, nil, err
	}
	return http.MethodPost, http.Header{
		"X-DashScope-DataInspection": {"enable"},
	}, bytes.NewReader(data), nil
}

func TTSDoRequest(meta *meta.Meta, req *http.Request) (*http.Response, error) {
	wsURL := req.URL
	wsURL.Scheme = "wss"

	conn, _, err := websocket.DefaultDialer.Dial(wsURL.String(), req.Header)
	if err != nil {
		return nil, err
	}
	meta.Set("ws_conn", conn)

	writer, err := conn.NextWriter(websocket.TextMessage)
	if err != nil {
		return nil, err
	}
	defer writer.Close()

	_, err = io.Copy(writer, req.Body)
	if err != nil {
		return nil, err
	}

	return &http.Response{
		StatusCode: http.StatusOK,
		Body:       io.NopCloser(nil),
	}, nil
}

func TTSDoResponse(meta *meta.Meta, c *gin.Context, _ *http.Response) (usage *relaymodel.Usage, err *relaymodel.ErrorWithStatusCode) {
	log := middleware.GetLogger(c)

	conn := meta.MustGet("ws_conn").(*websocket.Conn)
	defer conn.Close()

	usage = &relaymodel.Usage{}

	for {
		messageType, data, err := conn.ReadMessage()
		if err != nil {
			return usage, openai.ErrorWrapperWithMessage("ali_wss_read_msg_failed", "ali_wss_read_msg_failed", http.StatusInternalServerError)
		}

		var msg TTSMessage
		switch messageType {
		case websocket.TextMessage:
			err = json.Unmarshal(data, &msg)
			if err != nil {
				return usage, openai.ErrorWrapperWithMessage("ali_wss_read_msg_failed", "ali_wss_read_msg_failed", http.StatusInternalServerError)
			}
			switch msg.Header.Event {
			case "task-started":
				continue
			case "result-generated":
				continue
			case "task-finished":
				usage.PromptTokens = msg.Payload.Usage.Characters
				usage.TotalTokens = msg.Payload.Usage.Characters
				return usage, nil
			case "task-failed":
				return usage, openai.ErrorWrapperWithMessage(msg.Header.ErrorMessage, msg.Header.ErrorCode, http.StatusInternalServerError)
			}
		case websocket.BinaryMessage:
			_, writeErr := c.Writer.Write(data)
			if writeErr != nil {
				log.Error("write tts response chunk failed: " + writeErr.Error())
			}
		}
	}
}
