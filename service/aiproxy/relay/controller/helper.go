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
	price,
	completionPrice float64,
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
	if usage == nil {
		err := model.BatchRecordConsume(
			meta.RequestID,
			meta.RequestAt,
			meta.Group.ID,
			code,
			meta.Channel.ID,
			0,
			0,
			meta.OriginModel,
			meta.Token.ID,
			meta.Token.Name,
			0,
			price,
			completionPrice,
			meta.Endpoint,
			content,
			meta.Mode,
			requestDetail,
		)
		if err != nil {
			log.Error("error batch record consume: " + err.Error())
		}
		return
	}
	promptTokens := usage.PromptTokens
	completionTokens := usage.CompletionTokens
	var amount float64
	totalTokens := promptTokens + completionTokens
	if totalTokens != 0 {
		promptAmount := decimal.
			NewFromInt(int64(promptTokens)).
			Mul(decimal.NewFromFloat(price)).
			Div(decimal.NewFromInt(billingprice.PriceUnit))
		completionAmount := decimal.
			NewFromInt(int64(completionTokens)).
			Mul(decimal.NewFromFloat(completionPrice)).
			Div(decimal.NewFromInt(billingprice.PriceUnit))
		amount = promptAmount.Add(completionAmount).InexactFloat64()
		if amount > 0 {
			_amount, err := postGroupConsumer.PostGroupConsume(ctx, meta.Token.Name, amount)
			if err != nil {
				log.Error("error consuming token remain amount: " + err.Error())
				err = model.CreateConsumeError(
					meta.RequestID,
					meta.RequestAt,
					meta.Group.ID,
					meta.Token.Name,
					meta.OriginModel,
					err.Error(),
					amount,
					meta.Token.ID,
				)
				if err != nil {
					log.Error("failed to create consume error: " + err.Error())
				}
			} else {
				amount = _amount
			}
		}
	}
	err := model.BatchRecordConsume(
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
		price,
		completionPrice,
		meta.Endpoint,
		content,
		meta.Mode,
		requestDetail,
	)
	if err != nil {
		log.Error("error batch record consume: " + err.Error())
	}
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

func DoHelper(a adaptor.Adaptor, c *gin.Context, meta *meta.Meta) (*relaymodel.Usage, *model.RequestDetail, *relaymodel.ErrorWithStatusCode) {
	log := middleware.GetLogger(c)

	detail := model.RequestDetail{}
	switch meta.Mode {
	case relaymode.AudioTranscription, relaymode.AudioTranslation:
		break
	default:
		reqBody, err := common.GetRequestBody(c.Request)
		if err != nil {
			return nil, nil, openai.ErrorWrapperWithMessage("get request body failed: "+err.Error(), "get_request_body_failed", http.StatusBadRequest)
		}
		detail.RequestBody = conv.BytesToString(reqBody)
	}

	method, header, body, err := a.ConvertRequest(meta, c.Request)
	if err != nil {
		return nil, &detail, openai.ErrorWrapperWithMessage("convert request failed: "+err.Error(), "convert_request_failed", http.StatusBadRequest)
	}

	fullRequestURL, err := a.GetRequestURL(meta)
	if err != nil {
		return nil, &detail, openai.ErrorWrapperWithMessage("get request url failed: "+err.Error(), "get_request_url_failed", http.StatusBadRequest)
	}

	timeout := config.GetTimeoutWithModelType()[meta.Mode]
	if timeout > 0 {
		rawRequest := c.Request
		ctx, cancel := context.WithTimeout(rawRequest.Context(), time.Duration(timeout)*time.Second)
		defer cancel()
		c.Request = rawRequest.WithContext(ctx)
		defer func() { c.Request = rawRequest }()
	}

	req, err := http.NewRequestWithContext(c.Request.Context(), method, fullRequestURL, body)
	if err != nil {
		return nil, &detail, openai.ErrorWrapperWithMessage("new request failed: "+err.Error(), "new_request_failed", http.StatusBadRequest)
	}
	log.Debugf("request url: %s", fullRequestURL)

	contentType := req.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/json; charset=utf-8"
	}
	req.Header.Set("Content-Type", contentType)
	for key, value := range header {
		req.Header[key] = value
	}
	err = a.SetupRequestHeader(meta, c, req)
	if err != nil {
		return nil, &detail, openai.ErrorWrapperWithMessage("setup request header failed: "+err.Error(), "setup_request_header_failed", http.StatusBadRequest)
	}

	resp, err := a.DoRequest(meta, c, req)
	if err != nil {
		if errors.Is(err, context.Canceled) {
			return nil, &detail, openai.ErrorWrapperWithMessage("do request failed: request canceled by client", "request_canceled", http.StatusBadRequest)
		}
		if errors.Is(err, context.DeadlineExceeded) {
			return nil, &detail, openai.ErrorWrapperWithMessage("do request failed: request timeout", "request_timeout", http.StatusGatewayTimeout)
		}
		return nil, &detail, openai.ErrorWrapperWithMessage("do request failed: "+err.Error(), "request_failed", http.StatusBadRequest)
	}

	if isErrorHappened(resp) {
		respBody, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, &detail, openai.ErrorWrapperWithMessage("read response body failed: "+err.Error(), "read_response_body_failed", http.StatusBadRequest)
		}
		detail.ResponseBody = conv.BytesToString(respBody)
		resp.Body = io.NopCloser(bytes.NewReader(respBody))
		return nil, &detail, utils.RelayErrorHandler(meta, resp)
	}

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
	// copy buf to detail.ResponseBody
	detail.ResponseBody = rw.body.String()
	if relayErr != nil {
		return nil, &detail, relayErr
	}
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
	return usage, &detail, nil
}
