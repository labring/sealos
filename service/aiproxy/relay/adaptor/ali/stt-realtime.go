package ali

import (
	"bytes"
	"io"
	"net/http"
	"strings"

	"github.com/bytedance/sonic"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
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
	Format     string `json:"format,omitempty"`
	SampleRate int    `json:"sample_rate,omitempty"`
}

type STTOutput struct {
	STTSentence STTSentence `json:"sentence"`
}

type STTSentence struct {
	Text    string `json:"text"`
	EndTime *int   `json:"end_time"`
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
		},
	}

	data, err := sonic.Marshal(sttRequest)
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
	audioData := meta.MustGet("audio_data").([]byte)
	taskID := meta.MustGet("task_id").(string)

	conn := meta.MustGet("ws_conn").(*websocket.Conn)
	defer conn.Close()

	output := strings.Builder{}

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
		err = sonic.Unmarshal(data, &msg)
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
			finishData, err := sonic.Marshal(finishMsg)
			if err != nil {
				return usage, openai.ErrorWrapperWithMessage("ali_wss_write_msg_failed", "ali_wss_write_msg_failed", http.StatusInternalServerError)
			}
			err = conn.WriteMessage(websocket.TextMessage, finishData)
			if err != nil {
				return usage, openai.ErrorWrapperWithMessage("ali_wss_write_msg_failed", "ali_wss_write_msg_failed", http.StatusInternalServerError)
			}
		case "result-generated":
			if msg.Payload.Output.STTSentence.Text != "" {
				output.WriteString(msg.Payload.Output.STTSentence.Text)
			}
			continue
		case "task-finished":
			usage.PromptTokens = msg.Payload.Usage.Characters
			usage.TotalTokens = msg.Payload.Usage.Characters
			c.JSON(http.StatusOK, gin.H{
				"text": output.String(),
			})
			return usage, nil
		case "task-failed":
			return usage, openai.ErrorWrapperWithMessage(msg.Header.ErrorMessage, msg.Header.ErrorCode, http.StatusInternalServerError)
		}
	}
}
