package gemini

import (
	"bufio"
	"bytes"
	"context"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/common/conv"
	"github.com/labring/sealos/service/aiproxy/common/image"
	"github.com/labring/sealos/service/aiproxy/common/random"
	"github.com/labring/sealos/service/aiproxy/common/render"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/constant"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/utils"
	log "github.com/sirupsen/logrus"
)

// https://ai.google.dev/docs/gemini_api_overview?hl=zh-cn

const (
	VisionMaxImageNum = 16
)

var toolChoiceTypeMap = map[string]string{
	"none":     "NONE",
	"auto":     "AUTO",
	"required": "ANY",
}

var mimeTypeMap = map[string]string{
	"json_object": "application/json",
	"text":        "text/plain",
}

type CountTokensResponse struct {
	Error       *Error `json:"error,omitempty"`
	TotalTokens int    `json:"totalTokens"`
}

func buildSafetySettings() []ChatSafetySettings {
	safetySetting := config.GetGeminiSafetySetting()
	return []ChatSafetySettings{
		{Category: "HARM_CATEGORY_HARASSMENT", Threshold: safetySetting},
		{Category: "HARM_CATEGORY_HATE_SPEECH", Threshold: safetySetting},
		{Category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", Threshold: safetySetting},
		{Category: "HARM_CATEGORY_DANGEROUS_CONTENT", Threshold: safetySetting},
		{Category: "HARM_CATEGORY_CIVIC_INTEGRITY", Threshold: safetySetting},
	}
}

func buildGenerationConfig(textRequest *model.GeneralOpenAIRequest) *ChatGenerationConfig {
	config := ChatGenerationConfig{
		Temperature:     textRequest.Temperature,
		TopP:            textRequest.TopP,
		MaxOutputTokens: textRequest.MaxTokens,
	}

	if textRequest.ResponseFormat != nil {
		if mimeType, ok := mimeTypeMap[textRequest.ResponseFormat.Type]; ok {
			config.ResponseMimeType = mimeType
		}
		if textRequest.ResponseFormat.JSONSchema != nil {
			config.ResponseSchema = textRequest.ResponseFormat.JSONSchema.Schema
			config.ResponseMimeType = mimeTypeMap["json_object"]
		}
	}

	return &config
}

func buildTools(textRequest *model.GeneralOpenAIRequest) []ChatTools {
	if textRequest.Tools != nil {
		functions := make([]model.Function, 0, len(textRequest.Tools))
		for _, tool := range textRequest.Tools {
			if parameters, ok := tool.Function.Parameters.(map[string]any); ok {
				if properties, ok := parameters["properties"].(map[string]any); ok {
					if len(properties) == 0 {
						tool.Function.Parameters = nil
					}
				}
			}
			functions = append(functions, tool.Function)
		}
		return []ChatTools{{FunctionDeclarations: functions}}
	}
	if textRequest.Functions != nil {
		return []ChatTools{{FunctionDeclarations: textRequest.Functions}}
	}
	return nil
}

func buildToolConfig(textRequest *model.GeneralOpenAIRequest) *ToolConfig {
	if textRequest.ToolChoice == nil {
		return nil
	}
	toolConfig := ToolConfig{
		FunctionCallingConfig: FunctionCallingConfig{
			Mode: "auto",
		},
	}
	switch mode := textRequest.ToolChoice.(type) {
	case string:
		if toolChoiceType, ok := toolChoiceTypeMap[mode]; ok {
			toolConfig.FunctionCallingConfig.Mode = toolChoiceType
		}
	case map[string]interface{}:
		toolConfig.FunctionCallingConfig.Mode = "ANY"
		if fn, ok := mode["function"].(map[string]interface{}); ok {
			if fnName, ok := fn["name"].(string); ok {
				toolConfig.FunctionCallingConfig.AllowedFunctionNames = []string{fnName}
			}
		}
	}
	return &toolConfig
}

func buildMessageParts(ctx context.Context, part model.MessageContent) ([]Part, error) {
	if part.Type == model.ContentTypeText {
		return []Part{{Text: part.Text}}, nil
	}

	if part.Type == model.ContentTypeImageURL {
		mimeType, data, err := image.GetImageFromURL(ctx, part.ImageURL.URL)
		if err != nil {
			return nil, err
		}
		return []Part{{
			InlineData: &InlineData{
				MimeType: mimeType,
				Data:     data,
			},
		}}, nil
	}

	return nil, nil
}

func buildContents(ctx context.Context, textRequest *model.GeneralOpenAIRequest) (*ChatContent, []*ChatContent, error) {
	contents := make([]*ChatContent, 0, len(textRequest.Messages))
	imageNum := 0

	var systemContent *ChatContent

	for _, message := range textRequest.Messages {
		content := ChatContent{
			Role:  message.Role,
			Parts: make([]Part, 0),
		}

		if message.Role == "assistant" && len(message.ToolCalls) > 0 {
			for _, toolCall := range message.ToolCalls {
				var args map[string]any
				if toolCall.Function.Arguments != "" {
					if err := json.Unmarshal([]byte(toolCall.Function.Arguments), &args); err != nil {
						args = make(map[string]any)
					}
				} else {
					args = make(map[string]any)
				}
				content.Parts = append(content.Parts, Part{
					FunctionCall: &FunctionCall{
						Name: toolCall.Function.Name,
						Args: args,
					},
				})
			}
		} else if message.Role == "tool" && message.ToolCallID != "" {
			var contentMap map[string]any
			if message.Content != nil {
				switch content := message.Content.(type) {
				case map[string]any:
					contentMap = content
				case string:
					if err := json.Unmarshal([]byte(content), &contentMap); err != nil {
						log.Error("unmarshal content failed: " + err.Error())
					}
				}
			} else {
				contentMap = make(map[string]any)
			}
			content.Parts = append(content.Parts, Part{
				FunctionResponse: &FunctionResponse{
					Name: *message.Name,
					Response: struct {
						Name    string         `json:"name"`
						Content map[string]any `json:"content"`
					}{
						Name:    *message.Name,
						Content: contentMap,
					},
				},
			})
		} else {
			openaiContent := message.ParseContent()
			for _, part := range openaiContent {
				if part.Type == model.ContentTypeImageURL {
					imageNum++
					if imageNum > VisionMaxImageNum {
						continue
					}
				}

				parts, err := buildMessageParts(ctx, part)
				if err != nil {
					return nil, nil, err
				}
				content.Parts = append(content.Parts, parts...)
			}
		}

		switch content.Role {
		case "assistant":
			content.Role = "model"
		case "tool":
			content.Role = "user"
		case "system":
			systemContent = &content
			continue
		}
		contents = append(contents, &content)
	}

	return systemContent, contents, nil
}

// Setting safety to the lowest possible values since Gemini is already powerless enough
func ConvertRequest(meta *meta.Meta, req *http.Request) (string, http.Header, io.Reader, error) {
	textRequest, err := utils.UnmarshalGeneralOpenAIRequest(req)
	if err != nil {
		return "", nil, nil, err
	}

	textRequest.Model = meta.ActualModel
	meta.Set("stream", textRequest.Stream)

	systemContent, contents, err := buildContents(req.Context(), textRequest)
	if err != nil {
		return "", nil, nil, err
	}

	// Build actual request
	geminiRequest := ChatRequest{
		Contents:          contents,
		SystemInstruction: systemContent,
		SafetySettings:    buildSafetySettings(),
		GenerationConfig:  buildGenerationConfig(textRequest),
		Tools:             buildTools(textRequest),
		ToolConfig:        buildToolConfig(textRequest),
	}

	data, err := json.Marshal(geminiRequest)
	if err != nil {
		return "", nil, nil, err
	}

	return http.MethodPost, nil, bytes.NewReader(data), nil
}

type ChatResponse struct {
	Candidates     []*ChatCandidate   `json:"candidates"`
	PromptFeedback ChatPromptFeedback `json:"promptFeedback"`
	UsageMetadata  *UsageMetadata     `json:"usageMetadata"`
	ModelVersion   string             `json:"modelVersion"`
}

type UsageMetadata struct {
	PromptTokenCount     int `json:"promptTokenCount"`
	CandidatesTokenCount int `json:"candidatesTokenCount"`
	TotalTokenCount      int `json:"totalTokenCount"`
}

func (g *ChatResponse) GetResponseText() string {
	if g == nil {
		return ""
	}
	builder := strings.Builder{}
	for _, candidate := range g.Candidates {
		for i, part := range candidate.Content.Parts {
			if i > 0 {
				builder.WriteString("\n")
			}
			builder.WriteString(part.Text)
		}
	}
	return builder.String()
}

type ChatCandidate struct {
	FinishReason  string             `json:"finishReason"`
	Content       ChatContent        `json:"content"`
	SafetyRatings []ChatSafetyRating `json:"safetyRatings"`
	Index         int64              `json:"index"`
}

type ChatSafetyRating struct {
	Category    string `json:"category"`
	Probability string `json:"probability"`
}

type ChatPromptFeedback struct {
	SafetyRatings []ChatSafetyRating `json:"safetyRatings"`
}

func getToolCalls(candidate *ChatCandidate, toolCallIndex int) []*model.Tool {
	if len(candidate.Content.Parts) <= toolCallIndex {
		return nil
	}

	var toolCalls []*model.Tool
	item := candidate.Content.Parts[toolCallIndex]
	if item.FunctionCall == nil {
		return toolCalls
	}
	argsBytes, err := json.Marshal(item.FunctionCall.Args)
	if err != nil {
		log.Error("getToolCalls failed: " + err.Error())
		return toolCalls
	}
	toolCall := model.Tool{
		ID:   "call_" + random.GetUUID(),
		Type: "function",
		Function: model.Function{
			Arguments: conv.BytesToString(argsBytes),
			Name:      item.FunctionCall.Name,
		},
	}
	toolCalls = append(toolCalls, &toolCall)
	return toolCalls
}

func responseGeminiChat2OpenAI(meta *meta.Meta, response *ChatResponse) *openai.TextResponse {
	fullTextResponse := openai.TextResponse{
		ID:      "chatcmpl-" + random.GetUUID(),
		Model:   meta.OriginModel,
		Object:  "chat.completion",
		Created: time.Now().Unix(),
		Choices: make([]*openai.TextResponseChoice, 0, len(response.Candidates)),
	}
	for i, candidate := range response.Candidates {
		choice := openai.TextResponseChoice{
			Index: i,
			Message: model.Message{
				Role: "assistant",
			},
			FinishReason: constant.StopFinishReason,
		}
		if len(candidate.Content.Parts) > 0 {
			toolCallIndex := -1
			for i, part := range candidate.Content.Parts {
				if part.FunctionCall != nil {
					toolCallIndex = i
					break
				}
			}
			if toolCallIndex != -1 {
				choice.Message.ToolCalls = getToolCalls(candidate, toolCallIndex)
				content := strings.Builder{}
				for i, part := range candidate.Content.Parts {
					if i == toolCallIndex {
						continue
					}
					content.WriteString(part.Text)
				}
				choice.Message.Content = content.String()
			} else {
				builder := strings.Builder{}
				for i, part := range candidate.Content.Parts {
					if i > 0 {
						builder.WriteString("\n")
					}
					builder.WriteString(part.Text)
				}
				choice.Message.Content = builder.String()
			}
		} else {
			choice.Message.Content = ""
			choice.FinishReason = candidate.FinishReason
		}
		fullTextResponse.Choices = append(fullTextResponse.Choices, &choice)
	}
	return &fullTextResponse
}

func streamResponseGeminiChat2OpenAI(meta *meta.Meta, geminiResponse *ChatResponse) *openai.ChatCompletionsStreamResponse {
	response := &openai.ChatCompletionsStreamResponse{
		ID:      "chatcmpl-" + random.GetUUID(),
		Created: time.Now().Unix(),
		Model:   meta.OriginModel,
		Object:  "chat.completion.chunk",
		Choices: make([]*openai.ChatCompletionsStreamResponseChoice, 0, len(geminiResponse.Candidates)),
	}
	if geminiResponse.UsageMetadata != nil {
		response.Usage = &model.Usage{
			PromptTokens:     geminiResponse.UsageMetadata.PromptTokenCount,
			CompletionTokens: geminiResponse.UsageMetadata.CandidatesTokenCount,
			TotalTokens:      geminiResponse.UsageMetadata.TotalTokenCount,
		}
	}
	for i, candidate := range geminiResponse.Candidates {
		choice := openai.ChatCompletionsStreamResponseChoice{
			Index: i,
		}
		if len(candidate.Content.Parts) > 0 {
			toolCallIndex := -1
			for i, part := range candidate.Content.Parts {
				if part.FunctionCall != nil {
					toolCallIndex = i
					break
				}
			}
			if toolCallIndex != -1 {
				choice.Delta.ToolCalls = getToolCalls(candidate, toolCallIndex)
				content := strings.Builder{}
				for i, part := range candidate.Content.Parts {
					if i == toolCallIndex {
						continue
					}
					content.WriteString(part.Text)
				}
				choice.Delta.Content = content.String()
			} else {
				builder := strings.Builder{}
				for i, part := range candidate.Content.Parts {
					if i > 0 {
						builder.WriteString("\n")
					}
					builder.WriteString(part.Text)
				}
				choice.Delta.Content = builder.String()
			}
		} else {
			choice.Delta.Content = ""
			choice.FinishReason = &candidate.FinishReason
		}
		response.Choices = append(response.Choices, &choice)
	}
	return response
}

func StreamHandler(meta *meta.Meta, c *gin.Context, resp *http.Response) (*model.Usage, *model.ErrorWithStatusCode) {
	defer resp.Body.Close()

	log := middleware.GetLogger(c)

	responseText := strings.Builder{}
	scanner := bufio.NewScanner(resp.Body)
	scanner.Split(bufio.ScanLines)

	common.SetEventStreamHeaders(c)

	usage := model.Usage{
		PromptTokens: meta.InputTokens,
	}

	for scanner.Scan() {
		data := scanner.Bytes()
		if len(data) < 6 || conv.BytesToString(data[:6]) != "data: " {
			continue
		}
		data = data[6:]

		if conv.BytesToString(data) == "[DONE]" {
			break
		}

		var geminiResponse ChatResponse
		err := json.Unmarshal(data, &geminiResponse)
		if err != nil {
			log.Error("error unmarshalling stream response: " + err.Error())
			continue
		}
		response := streamResponseGeminiChat2OpenAI(meta, &geminiResponse)
		if response.Usage != nil {
			usage = *response.Usage
		}

		responseText.WriteString(response.Choices[0].Delta.StringContent())

		_ = render.ObjectData(c, response)
	}

	if err := scanner.Err(); err != nil {
		log.Error("error reading stream: " + err.Error())
	}

	render.Done(c)

	return &usage, nil
}

func Handler(meta *meta.Meta, c *gin.Context, resp *http.Response) (*model.Usage, *model.ErrorWithStatusCode) {
	defer resp.Body.Close()

	var geminiResponse ChatResponse
	err := json.NewDecoder(resp.Body).Decode(&geminiResponse)
	if err != nil {
		return nil, openai.ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError)
	}
	if len(geminiResponse.Candidates) == 0 {
		return nil, openai.ErrorWrapperWithMessage("No candidates returned", "gemini_error", resp.StatusCode)
	}
	fullTextResponse := responseGeminiChat2OpenAI(meta, &geminiResponse)
	fullTextResponse.Model = meta.OriginModel

	usage := model.Usage{
		PromptTokens:     geminiResponse.UsageMetadata.PromptTokenCount,
		CompletionTokens: geminiResponse.UsageMetadata.CandidatesTokenCount,
		TotalTokens:      geminiResponse.UsageMetadata.TotalTokenCount,
	}
	fullTextResponse.Usage = usage
	jsonResponse, err := json.Marshal(fullTextResponse)
	if err != nil {
		return nil, openai.ErrorWrapper(err, "marshal_response_body_failed", http.StatusInternalServerError)
	}
	c.Writer.Header().Set("Content-Type", "application/json")
	c.Writer.WriteHeader(resp.StatusCode)
	_, _ = c.Writer.Write(jsonResponse)
	return &usage, nil
}
