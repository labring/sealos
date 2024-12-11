// Package aws provides the AWS adaptor for the relay service.
package aws

import (
	"io"
	"net/http"

	json "github.com/json-iterator/go"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime/types"
	"github.com/gin-gonic/gin"
	"github.com/jinzhu/copier"
	"github.com/labring/sealos/service/aiproxy/common/helper"
	"github.com/labring/sealos/service/aiproxy/common/render"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/anthropic"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/aws/utils"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
	"github.com/pkg/errors"
)

type awsModelItem struct {
	ID string
	model.ModelConfig
}

// AwsModelIDMap maps internal model identifiers to AWS model identifiers.
// For more details, see: https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids.html

var AwsModelIDMap = map[string]awsModelItem{
	"claude-instant-1.2": {
		ModelConfig: model.ModelConfig{
			Model: "claude-instant-1.2",
			Type:  relaymode.ChatCompletions,
			Owner: model.ModelOwnerAnthropic,
		},
		ID: "anthropic.claude-instant-v1",
	},
	"claude-2.0": {
		ModelConfig: model.ModelConfig{
			Model: "claude-2.0",
			Type:  relaymode.ChatCompletions,
			Owner: model.ModelOwnerAnthropic,
		},
		ID: "anthropic.claude-v2",
	},
	"claude-2.1": {
		ModelConfig: model.ModelConfig{
			Model: "claude-2.1",
			Type:  relaymode.ChatCompletions,
			Owner: model.ModelOwnerAnthropic,
		},
		ID: "anthropic.claude-v2:1",
	},
	"claude-3-haiku-20240307": {
		ModelConfig: model.ModelConfig{
			Model: "claude-3-haiku-20240307",
			Type:  relaymode.ChatCompletions,
			Owner: model.ModelOwnerAnthropic,
		},
		ID: "anthropic.claude-3-haiku-20240307-v1:0",
	},
	"claude-3-5-sonnet-latest": {
		ModelConfig: model.ModelConfig{
			Model: "claude-3-5-sonnet-latest",
			Type:  relaymode.ChatCompletions,
			Owner: model.ModelOwnerAnthropic,
		},
		ID: "anthropic.claude-3-5-sonnet-20241022-v2:0",
	},
	"claude-3-5-haiku-20241022": {
		ModelConfig: model.ModelConfig{
			Model: "claude-3-5-haiku-20241022",
			Type:  relaymode.ChatCompletions,
			Owner: model.ModelOwnerAnthropic,
		},
		ID: "anthropic.claude-3-5-haiku-20241022-v1:0",
	},
}

func awsModelID(requestModel string) (string, error) {
	if awsModelID, ok := AwsModelIDMap[requestModel]; ok {
		return awsModelID.ID, nil
	}

	return "", errors.Errorf("model %s not found", requestModel)
}

func Handler(meta *meta.Meta, c *gin.Context) (*relaymodel.ErrorWithStatusCode, *relaymodel.Usage) {
	awsModelID, err := awsModelID(meta.ActualModelName)
	if err != nil {
		return utils.WrapErr(errors.Wrap(err, "awsModelID")), nil
	}

	awsReq := &bedrockruntime.InvokeModelInput{
		ModelId:     aws.String(awsModelID),
		Accept:      aws.String("application/json"),
		ContentType: aws.String("application/json"),
	}

	convReq, ok := meta.Get(ConvertedRequest)
	if !ok {
		return utils.WrapErr(errors.New("request not found")), nil
	}
	claudeReq := convReq.(*anthropic.Request)
	awsClaudeReq := &Request{
		AnthropicVersion: "bedrock-2023-05-31",
	}
	if err = copier.Copy(awsClaudeReq, claudeReq); err != nil {
		return utils.WrapErr(errors.Wrap(err, "copy request")), nil
	}

	awsReq.Body, err = json.Marshal(awsClaudeReq)
	if err != nil {
		return utils.WrapErr(errors.Wrap(err, "marshal request")), nil
	}

	awsResp, err := meta.AwsClient().InvokeModel(c.Request.Context(), awsReq)
	if err != nil {
		return utils.WrapErr(errors.Wrap(err, "InvokeModel")), nil
	}

	claudeResponse := new(anthropic.Response)
	err = json.Unmarshal(awsResp.Body, claudeResponse)
	if err != nil {
		return utils.WrapErr(errors.Wrap(err, "unmarshal response")), nil
	}

	openaiResp := anthropic.ResponseClaude2OpenAI(claudeResponse)
	openaiResp.Model = meta.OriginModelName
	usage := relaymodel.Usage{
		PromptTokens:     claudeResponse.Usage.InputTokens,
		CompletionTokens: claudeResponse.Usage.OutputTokens,
		TotalTokens:      claudeResponse.Usage.InputTokens + claudeResponse.Usage.OutputTokens,
	}
	openaiResp.Usage = usage

	c.JSON(http.StatusOK, openaiResp)
	return nil, &usage
}

func StreamHandler(meta *meta.Meta, c *gin.Context) (*relaymodel.ErrorWithStatusCode, *relaymodel.Usage) {
	log := middleware.GetLogger(c)
	createdTime := helper.GetTimestamp()
	originModelName := meta.OriginModelName
	awsModelID, err := awsModelID(meta.ActualModelName)
	if err != nil {
		return utils.WrapErr(errors.Wrap(err, "awsModelID")), nil
	}

	awsReq := &bedrockruntime.InvokeModelWithResponseStreamInput{
		ModelId:     aws.String(awsModelID),
		Accept:      aws.String("application/json"),
		ContentType: aws.String("application/json"),
	}

	convReq, ok := meta.Get(ConvertedRequest)
	if !ok {
		return utils.WrapErr(errors.New("request not found")), nil
	}
	claudeReq := convReq.(*anthropic.Request)

	awsClaudeReq := &Request{
		AnthropicVersion: "bedrock-2023-05-31",
	}
	if err = copier.Copy(awsClaudeReq, claudeReq); err != nil {
		return utils.WrapErr(errors.Wrap(err, "copy request")), nil
	}
	awsReq.Body, err = json.Marshal(awsClaudeReq)
	if err != nil {
		return utils.WrapErr(errors.Wrap(err, "marshal request")), nil
	}

	awsResp, err := meta.AwsClient().InvokeModelWithResponseStream(c.Request.Context(), awsReq)
	if err != nil {
		return utils.WrapErr(errors.Wrap(err, "InvokeModelWithResponseStream")), nil
	}
	stream := awsResp.GetStream()
	defer stream.Close()

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	var usage relaymodel.Usage
	var id string
	var lastToolCallChoice *openai.ChatCompletionsStreamResponseChoice

	c.Stream(func(_ io.Writer) bool {
		event, ok := <-stream.Events()
		if !ok {
			render.StringData(c, "[DONE]")
			return false
		}

		switch v := event.(type) {
		case *types.ResponseStreamMemberChunk:
			claudeResp := anthropic.StreamResponse{}
			err := json.Unmarshal(v.Value.Bytes, &claudeResp)
			if err != nil {
				log.Error("error unmarshalling stream response: " + err.Error())
				return false
			}

			response, meta := anthropic.StreamResponseClaude2OpenAI(&claudeResp)
			if response == nil {
				return true
			}
			if meta != nil {
				usage.PromptTokens += meta.Usage.InputTokens
				usage.CompletionTokens += meta.Usage.OutputTokens
				if len(meta.ID) > 0 { // only message_start has an id, otherwise it's a finish_reason event.
					id = "chatcmpl-" + meta.ID
					return true
				}
				if lastToolCallChoice != nil && len(lastToolCallChoice.Delta.ToolCalls) > 0 {
					lastArgs := &lastToolCallChoice.Delta.ToolCalls[len(lastToolCallChoice.Delta.ToolCalls)-1].Function
					if len(lastArgs.Arguments) == 0 { // compatible with OpenAI sending an empty object `{}` when no arguments.
						lastArgs.Arguments = "{}"
						response.Choices[len(response.Choices)-1].Delta.Content = nil
						response.Choices[len(response.Choices)-1].Delta.ToolCalls = lastToolCallChoice.Delta.ToolCalls
					}
				}
			}
			response.ID = id
			response.Model = originModelName
			response.Created = createdTime

			for _, choice := range response.Choices {
				if len(choice.Delta.ToolCalls) > 0 {
					lastToolCallChoice = choice
				}
			}
			err = render.ObjectData(c, response)
			if err != nil {
				log.Error("error stream response: " + err.Error())
				return false
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
