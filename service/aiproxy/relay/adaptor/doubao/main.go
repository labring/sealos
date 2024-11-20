package doubao

import (
	"fmt"
	"strings"

	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

func GetRequestURL(meta *meta.Meta) (string, error) {
	switch meta.Mode {
	case relaymode.ChatCompletions:
		if strings.HasPrefix(meta.ActualModelName, "bot-") {
			return meta.BaseURL + "/api/v3/bots/chat/completions", nil
		}
		return meta.BaseURL + "/api/v3/chat/completions", nil
	case relaymode.Embeddings:
		return meta.BaseURL + "/api/v3/embeddings", nil
	default:
		return "", fmt.Errorf("unsupported relay mode %d for doubao", meta.Mode)
	}
}
