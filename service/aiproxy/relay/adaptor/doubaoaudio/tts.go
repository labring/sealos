package doubaoaudio

import (
	"bytes"
	"compress/gzip"
	"encoding/binary"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/labring/sealos/service/aiproxy/common/conv"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/utils"
)

type DoubaoTTSRequest struct {
	Request RequestConfig `json:"request"`
	App     AppConfig     `json:"app"`
	User    UserConfig    `json:"user"`
	Audio   AudioConfig   `json:"audio"`
}

type AppConfig struct {
	AppID   string `json:"appid"`
	Token   string `json:"token"`
	Cluster string `json:"cluster"`
}

type UserConfig struct {
	UID string `json:"uid,omitempty"`
}

type AudioConfig struct {
	VoiceType   string  `json:"voice_type"`
	Encoding    string  `json:"encoding"`
	SpeedRatio  float64 `json:"speed_ratio,omitempty"`
	VolumeRatio float64 `json:"volume_ratio,omitempty"`
	PitchRatio  float64 `json:"pitch_ratio,omitempty"`
}

type RequestConfig struct {
	ReqID     string `json:"reqid"`
	Text      string `json:"text"`
	TextType  string `json:"text_type"`
	Operation string `json:"operation"`
}

// version: b0001 (4 bits)
// header size: b0001 (4 bits)
// message type: b0001 (Full client request) (4bits)
// message type specific flags: b0000 (none) (4bits)
// message serialization method: b0001 (JSON) (4 bits)
// message compression: b0001 (gzip) (4bits)
// reserved data: 0x00 (1 byte)
var defaultHeader = []byte{0x11, 0x10, 0x11, 0x00}

//nolint:gosec
func ConvertTTSRequest(meta *meta.Meta, req *http.Request) (string, http.Header, io.Reader, error) {
	request, err := utils.UnmarshalTTSRequest(req)
	if err != nil {
		return "", nil, nil, err
	}

	reqMap, err := utils.UnmarshalMap(req)
	if err != nil {
		return "", nil, nil, err
	}

	appID, token, err := getAppIDAndToken(meta.Channel.Key)
	if err != nil {
		return "", nil, nil, err
	}

	cluster := "volcano_tts"
	textType := "ssml"
	if strings.HasPrefix(request.Voice, "S_") {
		cluster = "volcano_mega"
		textType = "plain"
	}

	doubaoRequest := DoubaoTTSRequest{
		App: AppConfig{
			AppID:   appID,
			Token:   token,
			Cluster: cluster,
		},
		User: UserConfig{
			UID: meta.RequestID,
		},
		Audio: AudioConfig{
			SpeedRatio: request.Speed,
		},
		Request: RequestConfig{
			ReqID:     uuid.New().String(),
			Text:      request.Input,
			TextType:  textType,
			Operation: "submit",
		},
	}

	if request.Voice == "" {
		request.Voice = "zh_female_cancan_mars_bigtts"
	}
	doubaoRequest.Audio.VoiceType = request.Voice

	if request.ResponseFormat == "" {
		request.ResponseFormat = "pcm"
	}
	doubaoRequest.Audio.Encoding = request.ResponseFormat

	volumeRatio, ok := reqMap["volume_ratio"].(float64)
	if ok {
		doubaoRequest.Audio.VolumeRatio = volumeRatio
	}
	pitchRatio, ok := reqMap["pitch_ratio"].(float64)
	if ok {
		doubaoRequest.Audio.PitchRatio = pitchRatio
	}

	data, err := json.Marshal(doubaoRequest)
	if err != nil {
		return "", nil, nil, err
	}

	compressedData, err := gzipCompress(data)
	if err != nil {
		return "", nil, nil, err
	}

	payloadArr := make([]byte, 4)
	binary.BigEndian.PutUint32(payloadArr, uint32(len(compressedData)))
	clientRequest := make([]byte, len(defaultHeader))
	copy(clientRequest, defaultHeader)
	clientRequest = append(clientRequest, payloadArr...)
	clientRequest = append(clientRequest, compressedData...)

	return http.MethodPost, nil, bytes.NewReader(clientRequest), nil
}

func TTSDoRequest(meta *meta.Meta, req *http.Request) (*http.Response, error) {
	wsURL := req.URL
	wsURL.Scheme = "wss"

	conn, _, err := websocket.DefaultDialer.Dial(wsURL.String(), req.Header)
	if err != nil {
		return nil, err
	}
	meta.Set("ws_conn", conn)

	writer, err := conn.NextWriter(websocket.BinaryMessage)
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

func TTSDoResponse(meta *meta.Meta, c *gin.Context, _ *http.Response) (*relaymodel.Usage, *relaymodel.ErrorWithStatusCode) {
	log := middleware.GetLogger(c)

	conn := meta.MustGet("ws_conn").(*websocket.Conn)
	defer conn.Close()

	usage := &relaymodel.Usage{
		PromptTokens: meta.InputTokens,
		TotalTokens:  meta.InputTokens,
	}

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			return usage, openai.ErrorWrapperWithMessage(err.Error(), "doubao_wss_read_msg_failed", http.StatusInternalServerError)
		}

		resp, err := parseResponse(message)
		if err != nil {
			return usage, openai.ErrorWrapperWithMessage(err.Error(), "doubao_tts_parse_response_failed", http.StatusInternalServerError)
		}

		_, err = c.Writer.Write(resp.Audio)
		if err != nil {
			log.Error("write tts response chunk failed: " + err.Error())
		}

		if resp.IsLast {
			break
		}
	}

	return usage, nil
}

func gzipCompress(input []byte) ([]byte, error) {
	var b bytes.Buffer
	w := gzip.NewWriter(&b)
	_, err := w.Write(input)
	if err != nil {
		_ = w.Close()
		return nil, err
	}
	err = w.Close()
	if err != nil {
		return nil, err
	}
	return b.Bytes(), nil
}

func gzipDecompress(input []byte) ([]byte, error) {
	b := bytes.NewBuffer(input)
	r, err := gzip.NewReader(b)
	if err != nil {
		return nil, err
	}
	defer r.Close()
	out, err := io.ReadAll(r)
	if err != nil {
		return nil, err
	}
	return out, nil
}

type synResp struct {
	Audio  []byte
	IsLast bool
}

//nolint:gosec
func parseResponse(res []byte) (resp synResp, err error) {
	// protoVersion := res[0] >> 4
	headSize := res[0] & 0x0f
	messageType := res[1] >> 4
	messageTypeSpecificFlags := res[1] & 0x0f
	// serializationMethod := res[2] >> 4
	messageCompression := res[2] & 0x0f
	// reserve := res[3]
	// headerExtensions := res[4 : headSize*4]
	payload := res[headSize*4:]

	// audio-only server response
	switch messageType {
	case 0xb:
		// no sequence number as ACK
		if messageTypeSpecificFlags != 0 {
			sequenceNumber := int32(binary.BigEndian.Uint32(payload[0:4]))
			// payloadSize := int32(binary.BigEndian.Uint32(payload[4:8]))
			payload = payload[8:]
			resp.Audio = payload
			if sequenceNumber < 0 {
				resp.IsLast = true
			}
		}
		return
	case 0xf:
		// code := int32(binary.BigEndian.Uint32(payload[0:4]))
		errMsg := payload[8:]
		if messageCompression == 1 {
			errMsg, err = gzipDecompress(errMsg)
			if err != nil {
				return
			}
		}
		err = errors.New(conv.BytesToString(errMsg))
		return
	case 0xc:
		// msgSize = int32(binary.BigEndian.Uint32(payload[0:4]))
		// payload = payload[4:]
		// if messageCompression == 1 {
		// 	payload, err = gzipDecompress(payload)
		// 	if err != nil {
		// 		return
		// 	}
		// }
		return
	default:
		err = errors.New("wrong message type")
		return
	}
}
