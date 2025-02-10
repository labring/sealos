package controller

import (
	"bytes"
	"context"
	"errors"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/common/conv"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
	"github.com/labring/sealos/service/aiproxy/relay/utils"
	log "github.com/sirupsen/logrus"
)

func isErrorHappened(resp *http.Response) bool {
	if resp == nil {
		return false
	}
	return resp.StatusCode != http.StatusOK
}

const (
	// 0.5MB
	maxBufferSize = 512 * 1024
)

type responseWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	if total := rw.body.Len() + len(b); total <= maxBufferSize {
		rw.body.Write(b)
	} else {
		rw.body.Write(b[:maxBufferSize-rw.body.Len()])
	}
	return rw.ResponseWriter.Write(b)
}

func (rw *responseWriter) WriteString(s string) (int, error) {
	if total := rw.body.Len() + len(s); total <= maxBufferSize {
		rw.body.WriteString(s)
	} else {
		rw.body.WriteString(s[:maxBufferSize-rw.body.Len()])
	}
	return rw.ResponseWriter.WriteString(s)
}

var bufferPool = sync.Pool{
	New: func() interface{} {
		return bytes.NewBuffer(make([]byte, 0, maxBufferSize))
	},
}

func getBuffer() *bytes.Buffer {
	return bufferPool.Get().(*bytes.Buffer)
}

func putBuffer(buf *bytes.Buffer) {
	buf.Reset()
	if buf.Cap() > maxBufferSize {
		return
	}
	bufferPool.Put(buf)
}

func DoHelper(
	a adaptor.Adaptor,
	c *gin.Context,
	meta *meta.Meta,
) (
	*relaymodel.Usage,
	*model.RequestDetail,
	*relaymodel.ErrorWithStatusCode,
) {
	log := middleware.GetLogger(c)
	detail := model.RequestDetail{}

	// 1. Get request body
	if err := getRequestBody(meta, c, &detail); err != nil {
		return nil, nil, err
	}

	// 2. Convert and prepare request
	resp, err := prepareAndDoRequest(a, c, meta)
	if err != nil {
		return nil, &detail, err
	}

	// 3. Handle error response
	if isErrorHappened(resp) {
		relayErr := utils.RelayErrorHandler(meta, resp)
		detail.ResponseBody = relayErr.JSONOrEmpty()
		return nil, &detail, relayErr
	}

	// 4. Handle success response
	usage, relayErr := handleSuccessResponse(a, c, meta, resp, &detail)
	if relayErr != nil {
		return nil, &detail, relayErr
	}

	// 5. Update usage metrics
	updateUsageMetrics(usage, meta, log)

	return usage, &detail, nil
}

func getRequestBody(meta *meta.Meta, c *gin.Context, detail *model.RequestDetail) *relaymodel.ErrorWithStatusCode {
	switch meta.Mode {
	case relaymode.AudioTranscription, relaymode.AudioTranslation:
		return nil
	default:
		reqBody, err := common.GetRequestBody(c.Request)
		if err != nil {
			return openai.ErrorWrapperWithMessage("get request body failed: "+err.Error(), "get_request_body_failed", http.StatusBadRequest)
		}
		detail.RequestBody = conv.BytesToString(reqBody)
		return nil
	}
}

func prepareAndDoRequest(a adaptor.Adaptor, c *gin.Context, meta *meta.Meta) (*http.Response, *relaymodel.ErrorWithStatusCode) {
	method, header, body, err := a.ConvertRequest(meta, c.Request)
	if err != nil {
		return nil, openai.ErrorWrapperWithMessage("convert request failed: "+err.Error(), "convert_request_failed", http.StatusBadRequest)
	}

	if meta.Channel.BaseURL == "" {
		meta.Channel.BaseURL = a.GetBaseURL()
	}

	fullRequestURL, err := a.GetRequestURL(meta)
	if err != nil {
		return nil, openai.ErrorWrapperWithMessage("get request url failed: "+err.Error(), "get_request_url_failed", http.StatusBadRequest)
	}

	log.Debugf("request url: %s %s", method, fullRequestURL)

	ctx := context.Background()
	if timeout := config.GetTimeoutWithModelType()[meta.Mode]; timeout > 0 {
		// donot use c.Request.Context() because it will be canceled by the client
		// which will cause the usage of non-streaming requests to be unable to be recorded
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, time.Duration(timeout)*time.Second)
		defer cancel()
	}

	req, err := http.NewRequestWithContext(ctx, method, fullRequestURL, body)
	if err != nil {
		return nil, openai.ErrorWrapperWithMessage("new request failed: "+err.Error(), "new_request_failed", http.StatusBadRequest)
	}

	if err := setupRequestHeader(a, c, meta, req, header); err != nil {
		return nil, err
	}

	return doRequest(a, c, meta, req)
}

func setupRequestHeader(a adaptor.Adaptor, c *gin.Context, meta *meta.Meta, req *http.Request, header http.Header) *relaymodel.ErrorWithStatusCode {
	contentType := req.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/json; charset=utf-8"
	}
	req.Header.Set("Content-Type", contentType)
	for key, value := range header {
		req.Header[key] = value
	}
	if err := a.SetupRequestHeader(meta, c, req); err != nil {
		return openai.ErrorWrapperWithMessage("setup request header failed: "+err.Error(), "setup_request_header_failed", http.StatusBadRequest)
	}
	return nil
}

func doRequest(a adaptor.Adaptor, c *gin.Context, meta *meta.Meta, req *http.Request) (*http.Response, *relaymodel.ErrorWithStatusCode) {
	resp, err := a.DoRequest(meta, c, req)
	if err != nil {
		if errors.Is(err, context.Canceled) {
			return nil, openai.ErrorWrapperWithMessage("do request failed: request canceled by client", "request_canceled", http.StatusBadRequest)
		}
		if errors.Is(err, context.DeadlineExceeded) {
			return nil, openai.ErrorWrapperWithMessage("do request failed: request timeout", "request_timeout", http.StatusGatewayTimeout)
		}
		return nil, openai.ErrorWrapperWithMessage("do request failed: "+err.Error(), "request_failed", http.StatusBadRequest)
	}
	return resp, nil
}

func handleSuccessResponse(a adaptor.Adaptor, c *gin.Context, meta *meta.Meta, resp *http.Response, detail *model.RequestDetail) (*relaymodel.Usage, *relaymodel.ErrorWithStatusCode) {
	buf := getBuffer()
	defer putBuffer(buf)

	rw := &responseWriter{
		ResponseWriter: c.Writer,
		body:           buf,
	}
	rawWriter := c.Writer
	defer func() { c.Writer = rawWriter }()
	c.Writer = rw

	c.Header("Content-Type", resp.Header.Get("Content-Type"))
	usage, relayErr := a.DoResponse(meta, c, resp)
	// copy body buffer
	// do not use bytes conv
	detail.ResponseBody = rw.body.String()

	return usage, relayErr
}

func updateUsageMetrics(usage *relaymodel.Usage, meta *meta.Meta, log *log.Entry) {
	if usage == nil {
		usage = &relaymodel.Usage{
			PromptTokens: meta.InputTokens,
			TotalTokens:  meta.InputTokens,
		}
	}
	if usage.TotalTokens == 0 {
		usage.TotalTokens = usage.PromptTokens + usage.CompletionTokens
	}
	log.Data["t_input"] = usage.PromptTokens
	log.Data["t_output"] = usage.CompletionTokens
	log.Data["t_total"] = usage.TotalTokens
}
