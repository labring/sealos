package controller

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/balance"
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
)

var ConsumeWaitGroup sync.WaitGroup

type PreCheckGroupBalanceReq struct {
	PromptTokens int
	MaxTokens    int
	Price        float64
}

func getPreConsumedAmount(req *PreCheckGroupBalanceReq) float64 {
	if req.Price == 0 || (req.PromptTokens == 0 && req.MaxTokens == 0) {
		return 0
	}
	preConsumedTokens := int64(req.PromptTokens)
	if req.MaxTokens != 0 {
		preConsumedTokens += int64(req.MaxTokens)
	}
	return decimal.
		NewFromInt(preConsumedTokens).
		Mul(decimal.NewFromFloat(req.Price)).
		Div(decimal.NewFromInt(billingprice.PriceUnit)).
		InexactFloat64()
}

func preCheckGroupBalance(ctx context.Context, req *PreCheckGroupBalanceReq, meta *meta.Meta) (bool, balance.PostGroupConsumer, error) {
	if meta.IsChannelTest {
		return true, nil, nil
	}

	preConsumedAmount := getPreConsumedAmount(req)

	groupRemainBalance, postGroupConsumer, err := balance.Default.GetGroupRemainBalance(ctx, meta.Group.ID)
	if err != nil {
		return false, nil, err
	}
	if groupRemainBalance < preConsumedAmount {
		return false, nil, nil
	}
	return true, postGroupConsumer, nil
}

func postConsumeAmount(
	ctx context.Context,
	consumeWaitGroup *sync.WaitGroup,
	postGroupConsumer balance.PostGroupConsumer,
	code int,
	endpoint string,
	usage *relaymodel.Usage,
	meta *meta.Meta,
	price,
	completionPrice float64,
	content string,
	requestDetail *model.RequestDetail,
) {
	defer consumeWaitGroup.Done()
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
			meta.OriginModelName,
			meta.Token.ID,
			meta.Token.Name,
			0,
			price,
			completionPrice,
			endpoint,
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
					meta.OriginModelName,
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
		meta.OriginModelName,
		meta.Token.ID,
		meta.Token.Name,
		amount,
		price,
		completionPrice,
		endpoint,
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

	header, body, err := a.ConvertRequest(meta, c.Request)
	if err != nil {
		return nil, &detail, openai.ErrorWrapperWithMessage("convert request failed: "+err.Error(), "convert_request_failed", http.StatusBadRequest)
	}

	fullRequestURL, err := a.GetRequestURL(meta)
	if err != nil {
		return nil, &detail, openai.ErrorWrapperWithMessage("get request url failed: "+err.Error(), "get_request_url_failed", http.StatusBadRequest)
	}
	req, err := http.NewRequestWithContext(c.Request.Context(), c.Request.Method, fullRequestURL, body)
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
		return nil, &detail, openai.ErrorWrapperWithMessage("do request failed: "+err.Error(), "do_request_failed", http.StatusBadRequest)
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

	rw := &responseWriter{
		ResponseWriter: c.Writer,
		body:           bytes.NewBuffer(nil),
	}
	rawWriter := c.Writer
	defer func() { c.Writer = rawWriter }()
	c.Writer = rw

	c.Header("Content-Type", resp.Header.Get("Content-Type"))
	usage, relayErr := a.DoResponse(meta, c, resp)
	detail.ResponseBody = conv.BytesToString(rw.body.Bytes())
	if relayErr != nil {
		if detail.ResponseBody == "" {
			respData, err := json.Marshal(gin.H{
				"error": relayErr.Error,
			})
			if err != nil {
				detail.ResponseBody = relayErr.Error.String()
			} else {
				detail.ResponseBody = conv.BytesToString(respData)
			}
		}
		return nil, &detail, relayErr
	}
	if usage == nil {
		usage = &relaymodel.Usage{
			PromptTokens: meta.PromptTokens,
			TotalTokens:  meta.PromptTokens,
		}
	}
	if usage.TotalTokens == 0 {
		usage.TotalTokens = usage.PromptTokens + usage.CompletionTokens
	}
	return usage, &detail, nil
}
