package doc2x

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfig{
	{
		Model:      "pdf",
		Type:       relaymode.ParsePdf,
		Owner:      model.ModelOwnerDoc2x,
		InputPrice: 20,
		RPM:        10,
	},
}
