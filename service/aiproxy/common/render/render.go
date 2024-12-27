package render

import (
	"errors"
	"fmt"
	"strings"

	"github.com/gin-gonic/gin"
	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/conv"
)

var stdjson = json.ConfigCompatibleWithStandardLibrary

func StringData(c *gin.Context, str string) {
	if len(c.Errors) > 0 {
		return
	}
	if c.IsAborted() {
		return
	}
	str = strings.TrimPrefix(str, "data:")
	// str = strings.TrimSuffix(str, "\r")
	c.Render(-1, common.CustomEvent{Data: "data: " + strings.TrimSpace(str)})
	c.Writer.Flush()
}

func ObjectData(c *gin.Context, object any) error {
	if len(c.Errors) > 0 {
		return c.Errors.Last()
	}
	if c.IsAborted() {
		return errors.New("context aborted")
	}
	jsonData, err := stdjson.Marshal(object)
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
