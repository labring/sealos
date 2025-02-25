// Package aws provides the AWS adaptor for the relay service.
package aws

import (
	"bytes"
	"io"
	"net/http"
	"text/template"
	"time"

	json "github.com/json-iterator/go"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime/types"
	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common/random"
	"github.com/labring/sealos/service/aiproxy/common/render"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/aws/utils"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/constant"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
	"github.com/pkg/errors"
	log "github.com/sirupsen/logrus"
)

type awsModelItem struct {
	ID string
	model.ModelConfig
}

// AwsModelIDMap maps internal model identifiers to AWS model identifiers.
// It currently supports only llama-3-8b and llama-3-70b instruction models.
// For more details, see: https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids.html
var AwsModelIDMap = map[string]awsModelItem{
	"llama3-8b-8192": {
		ModelConfig: model.ModelConfig{
			Model: "llama3-8b-8192",
			Type:  relaymode.ChatCompletions,
			Owner: model.ModelOwnerMeta,
		},
		ID: "meta.llama3-8b-instruct-v1:0",
	},
	"llama3-70b-8192": {
		ModelConfig: model.ModelConfig{
			Model: "llama3-70b-8192",
			Type:  relaymode.ChatCompletions,
			Owner: model.ModelOwnerMeta,
		},
		ID: "meta.llama3-70b-instruct-v1:0",
	},
}

func awsModelID(requestModel string) (string, error) {
	if awsModelID, ok := AwsModelIDMap[requestModel]; ok {
		return awsModelID.ID, nil
	}

	return "", errors.Errorf("model %s not found", requestModel)
}

// promptTemplate with range
const promptTemplate = `<|begin_of_text|>{{range .Messages}}<|start_header_id|>{{.Role}}<|end_header_id|>{{.StringContent}}<|eot_id|>{{end}}<|start_header_id|>assistant<|end_header_id|>
`

var promptTpl = template.Must(template.New("llama3-chat").Parse(promptTemplate))

func RenderPrompt(messages []*relaymodel.Message) string {
	var buf bytes.Buffer
	err := promptTpl.Execute(&buf, struct{ Messages []*relaymodel.Message }{messages})
	if err != nil {
		log.Error("error rendering prompt messages: " + err.Error())
	}
	return buf.String()
}

func ConvertRequest(textRequest *relaymodel.GeneralOpenAIRequest) *Request {
	llamaRequest := Request{
		MaxGenLen:   textRequest.MaxTokens,
		Temperature: textRequest.Temperature,
		TopP:        textRequest.TopP,
	}
	if llamaRequest.MaxGenLen == 0 {
		llamaRequest.MaxGenLen = 2048
	}
	prompt := RenderPrompt(textRequest.Messages)
	llamaRequest.Prompt = prompt
	return &llamaRequest
}

func Handler(meta *meta.Meta, c *gin.Context) (*relaymodel.ErrorWithStatusCode, *relaymodel.Usage) {
	awsModelID, err := awsModelID(meta.ActualModel)
	if err != nil {
		return utils.WrapErr(errors.Wrap(err, "awsModelID")), nil
	}

	awsReq := &bedrockruntime.InvokeModelInput{
		ModelId:     aws.String(awsModelID),
		Accept:      aws.String("application/json"),
		ContentType: aws.String("application/json"),
	}

	llamaReq, ok := meta.Get(ConvertedRequest)
	if !ok {
		return utils.WrapErr(errors.New("request not found")), nil
	}

	awsReq.Body, err = json.Marshal(llamaReq)
	if err != nil {
		return utils.WrapErr(errors.Wrap(err, "marshal request")), nil
	}

	awsClient, err := utils.AwsClientFromMeta(meta)
	if err != nil {
		return utils.WrapErr(errors.Wrap(err, "get aws client")), nil
	}

	awsResp, err := awsClient.InvokeModel(c.Request.Context(), awsReq)
	if err != nil {
		return utils.WrapErr(errors.Wrap(err, "InvokeModel")), nil
	}

	var llamaResponse Response
	err = json.Unmarshal(awsResp.Body, &llamaResponse)
	if err != nil {
		return utils.WrapErr(errors.Wrap(err, "unmarshal response")), nil
	}

	openaiResp := ResponseLlama2OpenAI(&llamaResponse)
	openaiResp.Model = meta.OriginModel
	usage := relaymodel.Usage{
		PromptTokens:     llamaResponse.PromptTokenCount,
		CompletionTokens: llamaResponse.GenerationTokenCount,
		TotalTokens:      llamaResponse.PromptTokenCount + llamaResponse.GenerationTokenCount,
	}
	openaiResp.Usage = usage

	c.JSON(http.StatusOK, openaiResp)
	return nil, &usage
}

func ResponseLlama2OpenAI(llamaResponse *Response) *openai.TextResponse {
	var responseText string
	if len(llamaResponse.Generation) > 0 {
		responseText = llamaResponse.Generation
	}
	choice := openai.TextResponseChoice{
		Index: 0,
		Message: relaymodel.Message{
			Role:    "assistant",
			Content: responseText,
			Name:    nil,
		},
		FinishReason: llamaResponse.StopReason,
	}
	fullTextResponse := openai.TextResponse{
		ID:      "chatcmpl-" + random.GetUUID(),
		Object:  "chat.completion",
		Created: time.Now().Unix(),
		Choices: []*openai.TextResponseChoice{&choice},
	}
	return &fullTextResponse
}

func StreamHandler(meta *meta.Meta, c *gin.Context) (*relaymodel.ErrorWithStatusCode, *relaymodel.Usage) {
	log := middleware.GetLogger(c)

	createdTime := time.Now().Unix()
	awsModelID, err := awsModelID(meta.ActualModel)
	if err != nil {
		return utils.WrapErr(errors.Wrap(err, "awsModelID")), nil
	}

	awsReq := &bedrockruntime.InvokeModelWithResponseStreamInput{
		ModelId:     aws.String(awsModelID),
		Accept:      aws.String("application/json"),
		ContentType: aws.String("application/json"),
	}

	llamaReq, ok := meta.Get(ConvertedRequest)
	if !ok {
		return utils.WrapErr(errors.New("request not found")), nil
	}

	awsReq.Body, err = json.Marshal(llamaReq)
	if err != nil {
		return utils.WrapErr(errors.Wrap(err, "marshal request")), nil
	}

	awsClient, err := utils.AwsClientFromMeta(meta)
	if err != nil {
		return utils.WrapErr(errors.Wrap(err, "get aws client")), nil
	}

	awsResp, err := awsClient.InvokeModelWithResponseStream(c.Request.Context(), awsReq)
	if err != nil {
		return utils.WrapErr(errors.Wrap(err, "InvokeModelWithResponseStream")), nil
	}
	stream := awsResp.GetStream()
	defer stream.Close()

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	var usage relaymodel.Usage
	c.Stream(func(_ io.Writer) bool {
		event, ok := <-stream.Events()
		if !ok {
			render.Done(c)
			return false
		}

		switch v := event.(type) {
		case *types.ResponseStreamMemberChunk:
			var llamaResp StreamResponse
			err := json.Unmarshal(v.Value.Bytes, &llamaResp)
			if err != nil {
				log.Error("error unmarshalling stream response: " + err.Error())
				return false
			}

			if llamaResp.PromptTokenCount > 0 {
				usage.PromptTokens = llamaResp.PromptTokenCount
			}
			if llamaResp.StopReason == constant.StopFinishReason {
				usage.CompletionTokens = llamaResp.GenerationTokenCount
				usage.TotalTokens = usage.PromptTokens + usage.CompletionTokens
			}
			response := StreamResponseLlama2OpenAI(&llamaResp)
			response.ID = "chatcmpl-" + random.GetUUID()
			response.Model = meta.OriginModel
			response.Created = createdTime
			err = render.ObjectData(c, response)
			if err != nil {
				log.Error("error stream response: " + err.Error())
				return true
			}
			return true
		case *types.UnknownUnionMember:
			log.Error("unknown tag: " + v.Tag)
			return false
		default:
			log.Errorf("union is nil or unknown type: %v", v)
			return false
		}
	})

	return nil, &usage
}

func StreamResponseLlama2OpenAI(llamaResponse *StreamResponse) *openai.ChatCompletionsStreamResponse {
	var choice openai.ChatCompletionsStreamResponseChoice
	choice.Delta.Content = llamaResponse.Generation
	choice.Delta.Role = "assistant"
	finishReason := llamaResponse.StopReason
	if finishReason != "null" {
		choice.FinishReason = &finishReason
	}
	var openaiResponse openai.ChatCompletionsStreamResponse
	openaiResponse.Object = "chat.completion.chunk"
	openaiResponse.Choices = []*openai.ChatCompletionsStreamResponseChoice{&choice}
	return &openaiResponse
}
