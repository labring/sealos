package controller

import (
	"context"
	"sync"

	"github.com/labring/sealos/service/aiproxy/common/balance"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
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
		Div(decimal.NewFromInt(PriceUnit)).
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
		Div(decimal.NewFromInt(PriceUnit))
	completionAmount := decimal.NewFromInt(int64(completionTokens)).
		Mul(decimal.NewFromFloat(outputPrice)).
		Div(decimal.NewFromInt(PriceUnit))
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
