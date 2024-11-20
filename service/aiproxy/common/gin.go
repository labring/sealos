package common

import (
	"bytes"
	"fmt"
	"io"

	"github.com/gin-gonic/gin"
	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common/ctxkey"
)

func GetRequestBody(c *gin.Context) ([]byte, error) {
	requestBody, ok := c.Get(ctxkey.KeyRequestBody)
	if ok {
		return requestBody.([]byte), nil
	}
	var buf []byte
	var err error
	defer func() {
		c.Request.Body.Close()
		if err == nil {
			c.Request.Body = io.NopCloser(bytes.NewBuffer(buf))
		}
	}()
	if c.Request.ContentLength <= 0 || c.Request.Header.Get("Content-Type") != "application/json" {
		buf, err = io.ReadAll(c.Request.Body)
	} else {
		buf = make([]byte, c.Request.ContentLength)
		_, err = io.ReadFull(c.Request.Body, buf)
	}
	if err != nil {
		return nil, fmt.Errorf("request body read failed: %w", err)
	}
	c.Set(ctxkey.KeyRequestBody, buf)
	return buf, nil
}

func UnmarshalBodyReusable(c *gin.Context, v any) error {
	requestBody, err := GetRequestBody(c)
	if err != nil {
		return err
	}
	return json.Unmarshal(requestBody, &v)
}

func SetEventStreamHeaders(c *gin.Context) {
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("Transfer-Encoding", "chunked")
	c.Writer.Header().Set("X-Accel-Buffering", "no")
}
