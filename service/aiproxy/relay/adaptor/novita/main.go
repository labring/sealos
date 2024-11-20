package novita

import (
	"fmt"

	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

func GetRequestURL(meta *meta.Meta) (string, error) {
	if meta.Mode == relaymode.ChatCompletions {
		return meta.BaseURL + "/chat/completions", nil
	}
	return "", fmt.Errorf("unsupported relay mode %d for novita", meta.Mode)
}
