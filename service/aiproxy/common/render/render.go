package render

import (
	"fmt"
	"strings"

	"github.com/gin-gonic/gin"
	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/conv"
)

func StringData(c *gin.Context, str string) {
	str = strings.TrimPrefix(str, "data:")
	// str = strings.TrimSuffix(str, "\r")
	c.Render(-1, common.CustomEvent{Data: "data: " + strings.TrimSpace(str)})
	c.Writer.Flush()
}

func ObjectData(c *gin.Context, object any) error {
	jsonData, err := json.Marshal(object)
	if err != nil {
		return fmt.Errorf("error marshalling object: %w", err)
	}
	StringData(c, conv.BytesToString(jsonData))
	return nil
}

const DONE = "[DONE]"

func Done(c *gin.Context) {
	StringData(c, DONE)
}
