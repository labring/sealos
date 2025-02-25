package consume

import (
	"context"
	"sync"

	"github.com/labring/sealos/service/aiproxy/common/balance"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/shopspring/decimal"
	log "github.com/sirupsen/logrus"
)

var consumeWaitGroup sync.WaitGroup

func Wait() {
	consumeWaitGroup.Wait()
}

func AsyncConsume(
	postGroupConsumer balance.PostGroupConsumer,
	code int,
	usage *relaymodel.Usage,
	meta *meta.Meta,
	inputPrice,
	outputPrice float64,
	content string,
	ip string,
	requestDetail *model.RequestDetail,
) {
	if meta.IsChannelTest {
		return
	}

	consumeWaitGroup.Add(1)
	defer func() {
		consumeWaitGroup.Done()
		if r := recover(); r != nil {
			log.Errorf("panic in consume: %v", r)
		}
	}()

	go Consume(
		context.Background(),
		postGroupConsumer,
		code,
		usage,
		meta,
		inputPrice,
		outputPrice,
		content,
		ip,
		requestDetail,
	)
}

func Consume(
	ctx context.Context,
	postGroupConsumer balance.PostGroupConsumer,
	code int,
	usage *relaymodel.Usage,
	meta *meta.Meta,
	inputPrice,
	outputPrice float64,
	content string,
	ip string,
	requestDetail *model.RequestDetail,
) {
	if meta.IsChannelTest {
		return
	}

	amount := CalculateAmount(usage, inputPrice, outputPrice)

	amount = consumeAmount(ctx, amount, postGroupConsumer, meta)

	err := recordConsume(meta, code, usage, inputPrice, outputPrice, content, ip, requestDetail, amount)
	if err != nil {
		log.Error("error batch record consume: " + err.Error())
	}
}

func consumeAmount(
	ctx context.Context,
	amount float64,
	postGroupConsumer balance.PostGroupConsumer,
	meta *meta.Meta,
) float64 {
	if amount > 0 {
		return processGroupConsume(ctx, amount, postGroupConsumer, meta)
	}
	return 0
}

func CalculateAmount(
	usage *relaymodel.Usage,
	inputPrice, outputPrice float64,
) float64 {
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
		Div(decimal.NewFromInt(model.PriceUnit))
	completionAmount := decimal.NewFromInt(int64(completionTokens)).
		Mul(decimal.NewFromFloat(outputPrice)).
		Div(decimal.NewFromInt(model.PriceUnit))

	return promptAmount.Add(completionAmount).InexactFloat64()
}

func processGroupConsume(
	ctx context.Context,
	amount float64,
	postGroupConsumer balance.PostGroupConsumer,
	meta *meta.Meta,
) float64 {
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

func recordConsume(
	meta *meta.Meta,
	code int,
	usage *relaymodel.Usage,
	inputPrice,
	outputPrice float64,
	content string,
	ip string,
	requestDetail *model.RequestDetail,
	amount float64,
) error {
	promptTokens := 0
	completionTokens := 0
	if usage != nil {
		promptTokens = usage.PromptTokens
		completionTokens = usage.CompletionTokens
	}

	var channelID int
	if meta.Channel != nil {
		channelID = meta.Channel.ID
	}

	return model.BatchRecordConsume(
		meta.RequestID,
		meta.RequestAt,
		meta.Group.ID,
		code,
		channelID,
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
		ip,
		requestDetail,
	)
}
