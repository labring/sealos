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
			return fmt.Sprintf("%s/api/v3/bots/chat/completions", meta.BaseURL), nil
		}
		return fmt.Sprintf("%s/api/v3/chat/completions", meta.BaseURL), nil
	case relaymode.Embeddings:
		return fmt.Sprintf("%s/api/v3/embeddings", meta.BaseURL), nil
	default:
	}
	return "", fmt.Errorf("unsupported relay mode %d for doubao", meta.Mode)
}
