package aiproxy

import "github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"

var ModelList = []string{""}

func init() {
	ModelList = openai.ModelList
}
