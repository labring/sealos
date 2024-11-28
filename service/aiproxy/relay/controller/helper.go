package controller

import (
	"context"
	"net/http"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/balance"
	"github.com/labring/sealos/service/aiproxy/common/logger"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/channeltype"
	"github.com/labring/sealos/service/aiproxy/relay/controller/validator"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
	billingprice "github.com/labring/sealos/service/aiproxy/relay/price"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
	"github.com/shopspring/decimal"
)

var ConsumeWaitGroup sync.WaitGroup

func getAndValidateTextRequest(c *gin.Context, relayMode int) (*relaymodel.GeneralOpenAIRequest, error) {
	textRequest := &relaymodel.GeneralOpenAIRequest{}
	err := common.UnmarshalBodyReusable(c, textRequest)
	if err != nil {
		return nil, err
	}
	if relayMode == relaymode.Moderations && textRequest.Model == "" {
		textRequest.Model = "text-moderation-latest"
	}
	if relayMode == relaymode.Embeddings && textRequest.Model == "" {
		textRequest.Model = c.Param("model")
	}
	err = validator.ValidateTextRequest(textRequest, relayMode)
	if err != nil {
		return nil, err
	}
	return textRequest, nil
}

func getPromptTokens(textRequest *relaymodel.GeneralOpenAIRequest, relayMode int) int {
	switch relayMode {
	case relaymode.ChatCompletions:
		return openai.CountTokenMessages(textRequest.Messages, textRequest.Model)
	case relaymode.Completions:
		return openai.CountTokenInput(textRequest.Prompt, textRequest.Model)
	case relaymode.Moderations:
		return openai.CountTokenInput(textRequest.Input, textRequest.Model)
	}
	return 0
}

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
	preConsumedAmount := getPreConsumedAmount(req)

	groupRemainBalance, postGroupConsumer, err := balance.Default.GetGroupRemainBalance(ctx, meta.Group)
	if err != nil {
		return false, nil, err
	}
	if groupRemainBalance < preConsumedAmount {
		return false, nil, nil
	}
	return true, postGroupConsumer, nil
}

func postConsumeAmount(ctx context.Context, consumeWaitGroup *sync.WaitGroup, postGroupConsumer balance.PostGroupConsumer, code int, endpoint string, usage *relaymodel.Usage, meta *meta.Meta, price, completionPrice float64, content string) {
	defer consumeWaitGroup.Done()
	if usage == nil {
		err := model.BatchRecordConsume(ctx, meta.Group, code, meta.ChannelID, 0, 0, meta.OriginModelName, meta.TokenID, meta.TokenName, 0, price, completionPrice, endpoint, content)
		if err != nil {
			logger.Error(ctx, "error batch record consume: "+err.Error())
		}
		return
	}
	promptTokens := usage.PromptTokens
	completionTokens := usage.CompletionTokens
	var amount float64
	totalTokens := promptTokens + completionTokens
	if totalTokens != 0 {
		// amount = (float64(promptTokens)*price + float64(completionTokens)*completionPrice) / billingPrice.PriceUnit
		promptAmount := decimal.NewFromInt(int64(promptTokens)).Mul(decimal.NewFromFloat(price)).Div(decimal.NewFromInt(billingprice.PriceUnit))
		completionAmount := decimal.NewFromInt(int64(completionTokens)).Mul(decimal.NewFromFloat(completionPrice)).Div(decimal.NewFromInt(billingprice.PriceUnit))
		amount = promptAmount.Add(completionAmount).InexactFloat64()
		if amount > 0 {
			_amount, err := postGroupConsumer.PostGroupConsume(ctx, meta.TokenName, amount)
			if err != nil {
				logger.Error(ctx, "error consuming token remain amount: "+err.Error())
				err = model.CreateConsumeError(meta.Group, meta.TokenName, meta.OriginModelName, err.Error(), amount, meta.TokenID)
				if err != nil {
					logger.Error(ctx, "failed to create consume error: "+err.Error())
				}
			} else {
				amount = _amount
			}
		}
	}
	err := model.BatchRecordConsume(ctx, meta.Group, code, meta.ChannelID, promptTokens, completionTokens, meta.OriginModelName, meta.TokenID, meta.TokenName, amount, price, completionPrice, endpoint, content)
	if err != nil {
		logger.Error(ctx, "error batch record consume: "+err.Error())
	}
}

//nolint:unparam
func getMappedModelName(modelName string, mapping map[string]string) (string, bool) {
	if mapping == nil {
		return modelName, false
	}
	mappedModelName := mapping[modelName]
	if mappedModelName != "" {
		return mappedModelName, true
	}
	return modelName, false
}

func isErrorHappened(meta *meta.Meta, resp *http.Response) bool {
	if resp == nil {
		return meta.ChannelType != channeltype.AwsClaude
	}
	if resp.StatusCode != http.StatusOK {
		return true
	}
	if meta.ChannelType == channeltype.DeepL {
		// skip stream check for deepl
		return false
	}
	if meta.IsStream && strings.HasPrefix(resp.Header.Get("Content-Type"), "application/json") {
		return true
	}
	return false
}
