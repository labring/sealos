package controller

import (
	"bytes"
	"context"
	"errors"
	"io"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/balance"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/common/conv"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
	billingprice "github.com/labring/sealos/service/aiproxy/relay/price"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
	"github.com/labring/sealos/service/aiproxy/relay/utils"
	"github.com/shopspring/decimal"
	log "github.com/sirupsen/logrus"
)

var ConsumeWaitGroup sync.WaitGroup

type PreCheckGroupBalanceReq struct {
	InputTokens int
	MaxTokens   int
	InputPrice  float64
	OutputPrice float64
}

func getPreConsumedAmount(req *PreCheckGroupBalanceReq) float64 {
	if req == nil || req.InputPrice == 0 || (req.InputTokens == 0 && req.MaxTokens == 0) {
		return 0
	}
	preConsumedTokens := int64(req.InputTokens)
	if req.MaxTokens != 0 {
		preConsumedTokens += int64(req.MaxTokens)
	}
	return decimal.
		NewFromInt(preConsumedTokens).
		Mul(decimal.NewFromFloat(req.InputPrice)).
		Div(decimal.NewFromInt(billingprice.PriceUnit)).
		InexactFloat64()
}

func checkGroupBalance(req *PreCheckGroupBalanceReq, meta *meta.Meta, groupRemainBalance float64) bool {
	if meta.IsChannelTest {
		return true
	}
	if groupRemainBalance <= 0 {
		return false
	}

	preConsumedAmount := getPreConsumedAmount(req)

	return groupRemainBalance > preConsumedAmount
}

func getGroupBalance(ctx context.Context, meta *meta.Meta) (float64, balance.PostGroupConsumer, error) {
	if meta.IsChannelTest {
		return 0, nil, nil
	}

	return balance.Default.GetGroupRemainBalance(ctx, meta.Group.ID)
}

func postConsumeAmount(
	ctx context.Context,
	consumeWaitGroup *sync.WaitGroup,
	postGroupConsumer balance.PostGroupConsumer,
	code int,
	usage *relaymodel.Usage,
	meta *meta.Meta,
	inputPrice,
	outputPrice float64,
	content string,
	requestDetail *model.RequestDetail,
) {
	defer func() {
		consumeWaitGroup.Done()
		if r := recover(); r != nil {
			log.Errorf("panic in post consume amount: %v", r)
		}
	}()

	if meta.IsChannelTest {
		return
	}

	log := middleware.NewLogger()
	middleware.SetLogFieldsFromMeta(meta, log.Data)

	amount := calculateAmount(ctx, usage, inputPrice, outputPrice, postGroupConsumer, meta, log)

	err := recordConsume(meta, code, usage, inputPrice, outputPrice, content, requestDetail, amount)
	if err != nil {
		log.Error("error batch record consume: " + err.Error())
	}
}

func calculateAmount(ctx context.Context, usage *relaymodel.Usage, inputPrice, outputPrice float64, postGroupConsumer balance.PostGroupConsumer, meta *meta.Meta, log *log.Entry) float64 {
	if usage == nil {
		return 0
	}

	promptTokens := usage.PromptTokens
	completionTokens := usage.CompletionTokens
	totalTokens := promptTokens + completionTokens

	if totalTokens == 0 {
		return 0
	}

	promptAmount := decimal.NewFromInt(int64(promptTokens)).
		Mul(decimal.NewFromFloat(inputPrice)).
		Div(decimal.NewFromInt(billingprice.PriceUnit))
	completionAmount := decimal.NewFromInt(int64(completionTokens)).
		Mul(decimal.NewFromFloat(outputPrice)).
		Div(decimal.NewFromInt(billingprice.PriceUnit))
	amount := promptAmount.Add(completionAmount).InexactFloat64()

	if amount > 0 {
		return processGroupConsume(ctx, amount, postGroupConsumer, meta, log)
	}

	return 0
}

func processGroupConsume(ctx context.Context, amount float64, postGroupConsumer balance.PostGroupConsumer, meta *meta.Meta, log *log.Entry) float64 {
	consumedAmount, err := postGroupConsumer.PostGroupConsume(ctx, meta.Token.Name, amount)
	if err != nil {
		log.Error("error consuming token remain amount: " + err.Error())
		if err := model.CreateConsumeError(
			meta.RequestID,
			meta.RequestAt,
			meta.Group.ID,
			meta.Token.Name,
			meta.OriginModel,
			err.Error(),
			amount,
			meta.Token.ID,
		); err != nil {
			log.Error("failed to create consume error: " + err.Error())
		}
		return amount
	}
	return consumedAmount
}

func recordConsume(meta *meta.Meta, code int, usage *relaymodel.Usage, inputPrice, outputPrice float64, content string, requestDetail *model.RequestDetail, amount float64) error {
	promptTokens := 0
	completionTokens := 0
	if usage != nil {
		promptTokens = usage.PromptTokens
		completionTokens = usage.CompletionTokens
	}

	return model.BatchRecordConsume(
		meta.RequestID,
		meta.RequestAt,
		meta.Group.ID,
		code,
		meta.Channel.ID,
		promptTokens,
		completionTokens,
		meta.OriginModel,
		meta.Token.ID,
		meta.Token.Name,
		amount,
		inputPrice,
		outputPrice,
		meta.Endpoint,
		content,
		meta.Mode,
		requestDetail,
	)
}

func isErrorHappened(resp *http.Response) bool {
	if resp == nil {
		return false
	}
	return resp.StatusCode != http.StatusOK
}

type responseWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	rw.body.Write(b)
	return rw.ResponseWriter.Write(b)
}

func (rw *responseWriter) WriteString(s string) (int, error) {
	rw.body.WriteString(s)
	return rw.ResponseWriter.WriteString(s)
}

const (
	// 0.5MB
	defaultBufferSize = 512 * 1024
	// 3MB
	maxBufferSize = 3 * 1024 * 1024
)

var bufferPool = sync.Pool{
	New: func() interface{} {
		return bytes.NewBuffer(make([]byte, 0, defaultBufferSize))
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
		if err := handleErrorResponse(resp, &detail); err != nil {
			return nil, &detail, err
		}
		return nil, &detail, utils.RelayErrorHandler(meta, resp)
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

	fullRequestURL, err := a.GetRequestURL(meta)
	if err != nil {
		return nil, openai.ErrorWrapperWithMessage("get request url failed: "+err.Error(), "get_request_url_failed", http.StatusBadRequest)
	}

	if timeout := config.GetTimeoutWithModelType()[meta.Mode]; timeout > 0 {
		rawRequest := c.Request
		ctx, cancel := context.WithTimeout(rawRequest.Context(), time.Duration(timeout)*time.Second)
		defer cancel()
		c.Request = rawRequest.WithContext(ctx)
		defer func() { c.Request = rawRequest }()
	}

	req, err := http.NewRequestWithContext(c.Request.Context(), method, fullRequestURL, body)
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

func handleErrorResponse(resp *http.Response, detail *model.RequestDetail) *relaymodel.ErrorWithStatusCode {
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return openai.ErrorWrapperWithMessage("read response body failed: "+err.Error(), "read_response_body_failed", http.StatusBadRequest)
	}
	detail.ResponseBody = conv.BytesToString(respBody)
	resp.Body = io.NopCloser(bytes.NewReader(respBody))
	return nil
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
