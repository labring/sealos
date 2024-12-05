package anthropic

import (
	"bufio"
	"net/http"
	"slices"

	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common/conv"
	"github.com/labring/sealos/service/aiproxy/common/render"
	"github.com/labring/sealos/service/aiproxy/middleware"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/helper"
	"github.com/labring/sealos/service/aiproxy/common/image"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/model"
)

const toolUseType = "tool_use"

func stopReasonClaude2OpenAI(reason *string) string {
	if reason == nil {
		return ""
	}
	switch *reason {
	case "end_turn":
		return "stop"
	case "stop_sequence":
		return "stop"
	case "max_tokens":
		return "length"
	case toolUseType:
		return "tool_calls"
	default:
		return *reason
	}
}

func ConvertRequest(meta *meta.Meta, req *http.Request) (*Request, error) {
	var textRequest model.GeneralOpenAIRequest
	err := common.UnmarshalBodyReusable(req, &textRequest)
	if err != nil {
		return nil, err
	}
	textRequest.Model = meta.ActualModelName
	meta.Set("stream", textRequest.Stream)
	claudeTools := make([]Tool, 0, len(textRequest.Tools))

	for _, tool := range textRequest.Tools {
		if params, ok := tool.Function.Parameters.(map[string]any); ok {
			claudeTools = append(claudeTools, Tool{
				Name:        tool.Function.Name,
				Description: tool.Function.Description,
				InputSchema: InputSchema{
					Type:       params["type"].(string),
					Properties: params["properties"],
					Required:   params["required"],
				},
			})
		}
	}

	claudeRequest := Request{
		Model:       textRequest.Model,
		MaxTokens:   textRequest.MaxTokens,
		Temperature: textRequest.Temperature,
		TopP:        textRequest.TopP,
		TopK:        textRequest.TopK,
		Stream:      textRequest.Stream,
		Tools:       claudeTools,
	}
	if len(claudeTools) > 0 {
		claudeToolChoice := struct {
			Type string `json:"type"`
			Name string `json:"name,omitempty"`
		}{Type: "auto"} // default value https://docs.anthropic.com/en/docs/build-with-claude/tool-use#controlling-claudes-output
		if choice, ok := textRequest.ToolChoice.(map[string]any); ok {
			if function, ok := choice["function"].(map[string]any); ok {
				claudeToolChoice.Type = "tool"
				claudeToolChoice.Name = function["name"].(string)
			}
		} else if toolChoiceType, ok := textRequest.ToolChoice.(string); ok {
			if toolChoiceType == "any" {
				claudeToolChoice.Type = toolChoiceType
			}
		}
		claudeRequest.ToolChoice = claudeToolChoice
	}
	if claudeRequest.MaxTokens == 0 {
		claudeRequest.MaxTokens = 4096
	}
	// legacy model name mapping
	switch claudeRequest.Model {
	case "claude-instant-1":
		claudeRequest.Model = "claude-instant-1.1"
	case "claude-2":
		claudeRequest.Model = "claude-2.1"
	}
	for _, message := range textRequest.Messages {
		if message.Role == "system" && claudeRequest.System == "" {
			claudeRequest.System = message.StringContent()
			continue
		}
		claudeMessage := Message{
			Role: message.Role,
		}
		var content Content
		if message.IsStringContent() {
			content.Type = "text"
			content.Text = message.StringContent()
			if message.Role == "tool" {
				claudeMessage.Role = "user"
				content.Type = "tool_result"
				content.Content = content.Text
				content.Text = ""
				content.ToolUseID = message.ToolCallID
			}
			claudeMessage.Content = append(claudeMessage.Content, content)
			for i := range message.ToolCalls {
				inputParam := make(map[string]any)
				_ = json.Unmarshal(conv.StringToBytes(message.ToolCalls[i].Function.Arguments), &inputParam)
				claudeMessage.Content = append(claudeMessage.Content, Content{
					Type:  toolUseType,
					ID:    message.ToolCalls[i].ID,
					Name:  message.ToolCalls[i].Function.Name,
					Input: inputParam,
				})
			}
			claudeRequest.Messages = append(claudeRequest.Messages, claudeMessage)
			continue
		}
		var contents []Content
		openaiContent := message.ParseContent()
		for _, part := range openaiContent {
			var content Content
			switch part.Type {
			case model.ContentTypeText:
				content.Type = "text"
				content.Text = part.Text
			case model.ContentTypeImageURL:
				content.Type = "image"
				content.Source = &ImageSource{
					Type: "base64",
				}
				mimeType, data, err := image.GetImageFromURL(req.Context(), part.ImageURL.URL)
				if err != nil {
					return nil, err
				}
				content.Source.MediaType = mimeType
				content.Source.Data = data
			}
			contents = append(contents, content)
		}
		claudeMessage.Content = contents
		claudeRequest.Messages = append(claudeRequest.Messages, claudeMessage)
	}

	return &claudeRequest, nil
}

// https://docs.anthropic.com/claude/reference/messages-streaming
func StreamResponseClaude2OpenAI(claudeResponse *StreamResponse) (*openai.ChatCompletionsStreamResponse, *Response) {
	var response *Response
	var responseText string
	var stopReason string
	tools := make([]*model.Tool, 0)

	switch claudeResponse.Type {
	case "message_start":
		return nil, claudeResponse.Message
	case "content_block_start":
		if claudeResponse.ContentBlock != nil {
			responseText = claudeResponse.ContentBlock.Text
			if claudeResponse.ContentBlock.Type == toolUseType {
				tools = append(tools, &model.Tool{
					ID:   claudeResponse.ContentBlock.ID,
					Type: "function",
					Function: model.Function{
						Name:      claudeResponse.ContentBlock.Name,
						Arguments: "",
					},
				})
			}
		}
	case "content_block_delta":
		if claudeResponse.Delta != nil {
			responseText = claudeResponse.Delta.Text
			if claudeResponse.Delta.Type == "input_json_delta" {
				tools = append(tools, &model.Tool{
					Function: model.Function{
						Arguments: claudeResponse.Delta.PartialJSON,
					},
				})
			}
		}
	case "message_delta":
		if claudeResponse.Usage != nil {
			response = &Response{
				Usage: *claudeResponse.Usage,
			}
		}
		if claudeResponse.Delta != nil && claudeResponse.Delta.StopReason != nil {
			stopReason = *claudeResponse.Delta.StopReason
		}
	}
	var choice openai.ChatCompletionsStreamResponseChoice
	choice.Delta.Content = responseText
	if len(tools) > 0 {
		choice.Delta.Content = nil // compatible with other OpenAI derivative applications, like LobeOpenAICompatibleFactory ...
		choice.Delta.ToolCalls = tools
	}
	choice.Delta.Role = "assistant"
	finishReason := stopReasonClaude2OpenAI(&stopReason)
	if finishReason != "null" {
		choice.FinishReason = &finishReason
	}
	var openaiResponse openai.ChatCompletionsStreamResponse
	openaiResponse.Object = "chat.completion.chunk"
	openaiResponse.Choices = []*openai.ChatCompletionsStreamResponseChoice{&choice}
	return &openaiResponse, response
}

func ResponseClaude2OpenAI(claudeResponse *Response) *openai.TextResponse {
	var responseText string
	if len(claudeResponse.Content) > 0 {
		responseText = claudeResponse.Content[0].Text
	}
	tools := make([]*model.Tool, 0)
	for _, v := range claudeResponse.Content {
		if v.Type == toolUseType {
			args, _ := json.Marshal(v.Input)
			tools = append(tools, &model.Tool{
				ID:   v.ID,
				Type: "function", // compatible with other OpenAI derivative applications
				Function: model.Function{
					Name:      v.Name,
					Arguments: conv.BytesToString(args),
				},
			})
		}
	}
	choice := openai.TextResponseChoice{
		Index: 0,
		Message: model.Message{
			Role:      "assistant",
			Content:   responseText,
			Name:      nil,
			ToolCalls: tools,
		},
		FinishReason: stopReasonClaude2OpenAI(claudeResponse.StopReason),
	}
	fullTextResponse := openai.TextResponse{
		ID:      "chatcmpl-" + claudeResponse.ID,
		Model:   claudeResponse.Model,
		Object:  "chat.completion",
		Created: helper.GetTimestamp(),
		Choices: []*openai.TextResponseChoice{&choice},
	}
	return &fullTextResponse
}

func StreamHandler(_ *meta.Meta, c *gin.Context, resp *http.Response) (*model.ErrorWithStatusCode, *model.Usage) {
	defer resp.Body.Close()

	log := middleware.GetLogger(c)

	createdTime := helper.GetTimestamp()
	scanner := bufio.NewScanner(resp.Body)
	scanner.Split(func(data []byte, atEOF bool) (advance int, token []byte, err error) {
		if atEOF && len(data) == 0 {
			return 0, nil, nil
		}
		if i := slices.Index(data, '\n'); i >= 0 {
			return i + 1, data[0:i], nil
		}
		if atEOF {
			return len(data), data, nil
		}
		return 0, nil, nil
	})

	common.SetEventStreamHeaders(c)

	var usage model.Usage
	var modelName string
	var id string
	var lastToolCallChoice *openai.ChatCompletionsStreamResponseChoice

	for scanner.Scan() {
		data := scanner.Bytes()
		if len(data) < 6 || conv.BytesToString(data[:6]) != "data: " {
			continue
		}
		data = data[6:]

		if conv.BytesToString(data) == "[DONE]" {
			break
		}

		var claudeResponse StreamResponse
		err := json.Unmarshal(data, &claudeResponse)
		if err != nil {
			log.Error("error unmarshalling stream response: " + err.Error())
			continue
		}

		response, meta := StreamResponseClaude2OpenAI(&claudeResponse)
		if response == nil {
			continue
		}
		if meta != nil {
			usage.PromptTokens += meta.Usage.InputTokens
			usage.CompletionTokens += meta.Usage.OutputTokens
			if len(meta.ID) > 0 { // only message_start has an id, otherwise it's a finish_reason event.
				modelName = meta.Model
				id = "chatcmpl-" + meta.ID
				continue
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
		response.Model = modelName
		response.Created = createdTime

		for _, choice := range response.Choices {
			if len(choice.Delta.ToolCalls) > 0 {
				lastToolCallChoice = choice
			}
		}
		err = render.ObjectData(c, response)
		if err != nil {
			log.Error("error rendering stream response: " + err.Error())
		}
	}

	if err := scanner.Err(); err != nil {
		log.Error("error reading stream: " + err.Error())
	}

	render.Done(c)

	return nil, &usage
}

func Handler(meta *meta.Meta, c *gin.Context, resp *http.Response) (*model.ErrorWithStatusCode, *model.Usage) {
	defer resp.Body.Close()

	var claudeResponse Response
	err := json.NewDecoder(resp.Body).Decode(&claudeResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError), nil
	}
	if claudeResponse.Error.Type != "" {
		return &model.ErrorWithStatusCode{
			Error: model.Error{
				Message: claudeResponse.Error.Message,
				Type:    claudeResponse.Error.Type,
				Param:   "",
				Code:    claudeResponse.Error.Type,
			},
			StatusCode: resp.StatusCode,
		}, nil
	}
	fullTextResponse := ResponseClaude2OpenAI(&claudeResponse)
	fullTextResponse.Model = meta.OriginModelName
	usage := model.Usage{
		PromptTokens:     claudeResponse.Usage.InputTokens,
		CompletionTokens: claudeResponse.Usage.OutputTokens,
		TotalTokens:      claudeResponse.Usage.InputTokens + claudeResponse.Usage.OutputTokens,
	}
	fullTextResponse.Usage = usage
	jsonResponse, err := json.Marshal(fullTextResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "marshal_response_body_failed", http.StatusInternalServerError), nil
	}
	c.Writer.Header().Set("Content-Type", "application/json")
	c.Writer.WriteHeader(resp.StatusCode)
	_, _ = c.Writer.Write(jsonResponse)
	return nil, &usage
}
