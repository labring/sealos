package openai

import (
	"bytes"
	"errors"
	"io"
	"net/http"

	"github.com/bytedance/sonic/ast"
	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
)

func ConvertTTSRequest(meta *meta.Meta, req *http.Request, defaultVoice string) (string, http.Header, io.Reader, error) {
	node, err := common.UnmarshalBody2Node(req)
	if err != nil {
		return "", nil, nil, err
	}

	input, err := node.Get("input").String()
	if err != nil {
		if errors.Is(err, ast.ErrNotExist) {
			return "", nil, nil, errors.New("input is required")
		}
		return "", nil, nil, err
	}
	if len(input) > 4096 {
		return "", nil, nil, errors.New("input is too long (over 4096 characters)")
	}

	voice, err := node.Get("voice").String()
	if err != nil && !errors.Is(err, ast.ErrNotExist) {
		return "", nil, nil, err
	}
	if voice == "" && defaultVoice != "" {
		_, err = node.Set("voice", ast.NewString(defaultVoice))
		if err != nil {
			return "", nil, nil, err
		}
	}

	_, err = node.Set("model", ast.NewString(meta.ActualModel))
	if err != nil {
		return "", nil, nil, err
	}

	jsonData, err := node.MarshalJSON()
	if err != nil {
		return "", nil, nil, err
	}
	return http.MethodPost, nil, bytes.NewReader(jsonData), nil
}

func TTSHandler(meta *meta.Meta, c *gin.Context, resp *http.Response) (*relaymodel.Usage, *relaymodel.ErrorWithStatusCode) {
	if resp.StatusCode != http.StatusOK {
		return nil, ErrorHanlder(resp)
	}

	defer resp.Body.Close()

	log := middleware.GetLogger(c)

	for k, v := range resp.Header {
		c.Writer.Header().Set(k, v[0])
	}

	_, err := io.Copy(c.Writer, resp.Body)
	if err != nil {
		log.Warnf("write response body failed: %v", err)
	}
	return &relaymodel.Usage{
		PromptTokens:     meta.InputTokens,
		CompletionTokens: 0,
		TotalTokens:      meta.InputTokens,
	}, nil
}
