package minimax

import (
	"fmt"

	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

func GetRequestURL(meta *meta.Meta) (string, error) {
	if meta.Mode == relaymode.ChatCompletions {
		return meta.BaseURL + "/v1/text/chatcompletion_v2", nil
	}
	return "", fmt.Errorf("unsupported relay mode %d for minimax", meta.Mode)
}
