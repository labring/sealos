package controller

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"

	json "github.com/json-iterator/go"
	"github.com/shopspring/decimal"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/balance"
	"github.com/labring/sealos/service/aiproxy/common/ctxkey"
	"github.com/labring/sealos/service/aiproxy/relay"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
	billingprice "github.com/labring/sealos/service/aiproxy/relay/price"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

func RelayAudioHelper(c *gin.Context, relayMode int) *relaymodel.ErrorWithStatusCode {
	meta := meta.GetByContext(c)

	channelType := c.GetInt(ctxkey.Channel)
	group := c.GetString(ctxkey.Group)

	adaptor := relay.GetAdaptor(meta.APIType)
	if adaptor == nil {
		return openai.ErrorWrapper(fmt.Errorf("invalid api type: %d", meta.APIType), "invalid_api_type", http.StatusBadRequest)
	}
	adaptor.Init(meta)

	meta.ActualModelName, _ = getMappedModelName(meta.OriginModelName, c.GetStringMapString(ctxkey.ModelMapping))

	price, ok := billingprice.GetModelPrice(meta.OriginModelName, meta.ActualModelName, channelType)
	if !ok {
		return openai.ErrorWrapper(fmt.Errorf("model price not found: %s", meta.OriginModelName), "model_price_not_found", http.StatusInternalServerError)
	}
	completionPrice, ok := billingprice.GetModelPrice(meta.OriginModelName, meta.ActualModelName, channelType)
	if !ok {
		return openai.ErrorWrapper(fmt.Errorf("model price not found: %s", meta.OriginModelName), "model_price_not_found", http.StatusInternalServerError)
	}

	var body io.ReadCloser
	switch relayMode {
	case relaymode.AudioSpeech:
		var ttsRequest relaymodel.TextToSpeechRequest
		err := common.UnmarshalBodyReusable(c, &ttsRequest)
		if err != nil {
			return openai.ErrorWrapper(err, "invalid_json", http.StatusBadRequest)
		}
		ttsRequest.Model = meta.ActualModelName
		data, err := adaptor.ConvertTTSRequest(&ttsRequest)
		if err != nil {
			return openai.ErrorWrapper(err, "convert_tts_request_failed", http.StatusBadRequest)
		}
		jsonBody, err := json.Marshal(data)
		if err != nil {
			return openai.ErrorWrapper(err, "marshal_request_body_failed", http.StatusInternalServerError)
		}
		body = io.NopCloser(bytes.NewReader(jsonBody))
		meta.PromptTokens = openai.CountTokenText(ttsRequest.Input, meta.ActualModelName)
	case relaymode.AudioTranscription:
		var err error
		body, err = adaptor.ConvertSTTRequest(c.Request)
		if err != nil {
			return openai.ErrorWrapper(err, "convert_stt_request_failed", http.StatusBadRequest)
		}
	default:
		return openai.ErrorWrapper(fmt.Errorf("invalid relay mode: %d", relayMode), "invalid_relay_mode", http.StatusBadRequest)
	}

	groupRemainBalance, postGroupConsumer, err := balance.Default.GetGroupRemainBalance(c.Request.Context(), group)
	if err != nil {
		return openai.ErrorWrapper(err, "get_group_balance_failed", http.StatusInternalServerError)
	}

	preConsumedAmount := decimal.NewFromInt(int64(meta.PromptTokens)).
		Mul(decimal.NewFromFloat(price)).
		Div(decimal.NewFromInt(billingprice.PriceUnit)).
		InexactFloat64()
	// Check if group balance is enough
	if groupRemainBalance < preConsumedAmount {
		return openai.ErrorWrapper(errors.New("group balance is not enough"), "insufficient_group_balance", http.StatusForbidden)
	}

	resp, err := adaptor.DoRequest(c, meta, body)
	if err != nil {
		return openai.ErrorWrapper(err, "do_request_failed", http.StatusInternalServerError)
	}

	if resp.StatusCode != http.StatusOK {
		err := RelayErrorHandler(resp)
		go postConsumeAmount(context.Background(), postGroupConsumer, resp.StatusCode, c.Request.URL.Path, &relaymodel.Usage{
			PromptTokens:     0,
			CompletionTokens: 0,
		}, meta, price, completionPrice, err.Message)
		return err
	}

	usage, respErr := adaptor.DoResponse(c, resp, meta)
	if respErr != nil {
		return respErr
	}

	go postConsumeAmount(context.Background(), postGroupConsumer, resp.StatusCode, c.Request.URL.Path, usage, meta, price, completionPrice, "")

	return nil
}
