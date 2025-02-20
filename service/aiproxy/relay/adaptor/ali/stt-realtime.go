package ali

import (
	"bytes"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
)

type STTMessage struct {
	Header  STTHeader  `json:"header"`
	Payload STTPayload `json:"payload"`
}

type STTHeader struct {
	Attributes   map[string]any `json:"attributes"`
	Action       string         `json:"action,omitempty"`
	TaskID       string         `json:"task_id"`
	Streaming    string         `json:"streaming,omitempty"`
	Event        string         `json:"event,omitempty"`
	ErrorCode    string         `json:"error_code,omitempty"`
	ErrorMessage string         `json:"error_message,omitempty"`
}

type STTPayload struct {
	Model      string        `json:"model,omitempty"`
	TaskGroup  string        `json:"task_group,omitempty"`
	Task       string        `json:"task,omitempty"`
	Function   string        `json:"function,omitempty"`
	Input      STTInput      `json:"input,omitempty"`
	Output     STTOutput     `json:"output,omitempty"`
	Parameters STTParameters `json:"parameters,omitempty"`
	Usage      STTUsage      `json:"usage,omitempty"`
}

type STTInput struct {
	AudioData []byte `json:"audio_data"`
}

type STTParameters struct {
	Format     string `json:"format"`
	SampleRate int    `json:"sample_rate"`
}

type STTOutput struct {
	Text string `json:"text"`
}

type STTUsage struct {
	Characters int `json:"characters"`
}

func ConvertSTTRequest(meta *meta.Meta, request *http.Request) (string, http.Header, io.Reader, error) {
	err := request.ParseMultipartForm(1024 * 1024 * 4)
	if err != nil {
		return "", nil, nil, err
	}
	audioFile, _, err := request.FormFile("file")
	if err != nil {
		return "", nil, nil, err
	}
	audioData, err := io.ReadAll(audioFile)
	if err != nil {
		return "", nil, nil, err
	}
	sttRequest := STTMessage{
		Header: STTHeader{
			Action:    "run-task",
			Streaming: "duplex",
			TaskID:    uuid.New().String(),
		},
		Payload: STTPayload{
			Model:     meta.ActualModel,
			Task:      "asr",
			TaskGroup: "audio",
			Function:  "recognition",
			Input:     STTInput{},
			Parameters: STTParameters{
				Format:     "mp3",
				SampleRate: 16000,
			},
		},
	}

	data, err := json.Marshal(sttRequest)
	if err != nil {
		return "", nil, nil, err
	}
	meta.Set("audio_data", audioData)
	meta.Set("task_id", sttRequest.Header.TaskID)
	return http.MethodPost, http.Header{
		"X-DashScope-DataInspection": {"enable"},
	}, bytes.NewReader(data), nil
}

func STTDoRequest(meta *meta.Meta, req *http.Request) (*http.Response, error) {
	wsURL := req.URL
	wsURL.Scheme = "wss"

	conn, _, err := websocket.DefaultDialer.Dial(wsURL.String(), req.Header)
	if err != nil {
		return nil, err
	}
	meta.Set("ws_conn", conn)

	jsonWriter, err := conn.NextWriter(websocket.TextMessage)
	if err != nil {
		return nil, err
	}
	defer jsonWriter.Close()
	_, err = io.Copy(jsonWriter, req.Body)
	if err != nil {
		return nil, err
	}

	return &http.Response{
		StatusCode: http.StatusOK,
		Body:       io.NopCloser(nil),
	}, nil
}

func STTDoResponse(meta *meta.Meta, c *gin.Context, _ *http.Response) (usage *relaymodel.Usage, err *relaymodel.ErrorWithStatusCode) {
	log := middleware.GetLogger(c)

	audioData := meta.MustGet("audio_data").([]byte)
	taskID := meta.MustGet("task_id").(string)

	conn := meta.MustGet("ws_conn").(*websocket.Conn)
	defer conn.Close()

	usage = &relaymodel.Usage{}

	for {
		messageType, data, err := conn.ReadMessage()
		if err != nil {
			return usage, openai.ErrorWrapperWithMessage("ali_wss_read_msg_failed", "ali_wss_read_msg_failed", http.StatusInternalServerError)
		}

		if messageType != websocket.TextMessage {
			return usage, openai.ErrorWrapperWithMessage("expect text message, but got binary message", "ali_wss_read_msg_failed", http.StatusInternalServerError)
		}

		var msg STTMessage
		err = json.Unmarshal(data, &msg)
		if err != nil {
			return usage, openai.ErrorWrapperWithMessage("ali_wss_read_msg_failed", "ali_wss_read_msg_failed", http.StatusInternalServerError)
		}
		switch msg.Header.Event {
		case "task-started":
			err = conn.WriteMessage(websocket.BinaryMessage, audioData)
			if err != nil {
				return usage, openai.ErrorWrapperWithMessage("ali_wss_write_msg_failed", "ali_wss_write_msg_failed", http.StatusInternalServerError)
			}
			finishMsg := STTMessage{
				Header: STTHeader{
					Action:    "finish-task",
					TaskID:    taskID,
					Streaming: "duplex",
				},
				Payload: STTPayload{
					Input: STTInput{},
				},
			}
			finishData, err := json.Marshal(finishMsg)
			if err != nil {
				return usage, openai.ErrorWrapperWithMessage("ali_wss_write_msg_failed", "ali_wss_write_msg_failed", http.StatusInternalServerError)
			}
			err = conn.WriteMessage(websocket.TextMessage, finishData)
			if err != nil {
				return usage, openai.ErrorWrapperWithMessage("ali_wss_write_msg_failed", "ali_wss_write_msg_failed", http.StatusInternalServerError)
			}
		case "result-generated":
			if msg.Payload.Output.Text != "" {
				log.Info("STT result: " + msg.Payload.Output.Text)
			}
			continue
		case "task-finished":
			usage.PromptTokens = msg.Payload.Usage.Characters
			usage.TotalTokens = msg.Payload.Usage.Characters
			return usage, nil
		case "task-failed":
			return usage, openai.ErrorWrapperWithMessage(msg.Header.ErrorMessage, msg.Header.ErrorCode, http.StatusInternalServerError)
		}
	}
}
