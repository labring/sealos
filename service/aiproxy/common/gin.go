package common

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	json "github.com/json-iterator/go"
)

type RequestBodyKey struct{}

func GetRequestBody(req *http.Request) ([]byte, error) {
	requestBody := req.Context().Value(RequestBodyKey{})
	if requestBody != nil {
		return requestBody.([]byte), nil
	}
	var buf []byte
	var err error
	defer func() {
		req.Body.Close()
		if err == nil {
			req.Body = io.NopCloser(bytes.NewBuffer(buf))
		}
	}()
	if req.ContentLength <= 0 || req.Header.Get("Content-Type") != "application/json" {
		buf, err = io.ReadAll(req.Body)
	} else {
		buf = make([]byte, req.ContentLength)
		_, err = io.ReadFull(req.Body, buf)
	}
	if err != nil {
		return nil, fmt.Errorf("request body read failed: %w", err)
	}
	ctx := req.Context()
	bufCtx := context.WithValue(ctx, RequestBodyKey{}, buf)
	*req = *req.WithContext(bufCtx)
	return buf, nil
}

func UnmarshalBodyReusable(req *http.Request, v any) error {
	requestBody, err := GetRequestBody(req)
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
