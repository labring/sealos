package gemini

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"

	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common/conv"
	"github.com/labring/sealos/service/aiproxy/common/render"
	"github.com/labring/sealos/service/aiproxy/middleware"

	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/common/helper"
	"github.com/labring/sealos/service/aiproxy/common/image"
	"github.com/labring/sealos/service/aiproxy/common/random"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/constant"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/utils"
	log "github.com/sirupsen/logrus"

	"github.com/gin-gonic/gin"
)

// https://ai.google.dev/docs/gemini_api_overview?hl=zh-cn

const (
	VisionMaxImageNum = 16
)

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
			functions = append(functions, tool.Function)
		}
		return []ChatTools{{FunctionDeclarations: functions}}
	}
	if textRequest.Functions != nil {
		return []ChatTools{{FunctionDeclarations: textRequest.Functions}}
	}
	return nil
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

func buildContents(textRequest *model.GeneralOpenAIRequest, req *http.Request) ([]ChatContent, error) {
	contents := make([]ChatContent, 0, len(textRequest.Messages))
	shouldAddDummyModelMessage := false
	imageNum := 0

	for _, message := range textRequest.Messages {
		content := ChatContent{
			Role:  message.Role,
			Parts: make([]Part, 0),
		}

		// Convert role names
		switch content.Role {
		case "assistant":
			content.Role = "model"
		case "system":
			content.Role = "user"
			shouldAddDummyModelMessage = true
		}

		// Process message content
		openaiContent := message.ParseContent()
		for _, part := range openaiContent {
			if part.Type == model.ContentTypeImageURL {
				imageNum++
				if imageNum > VisionMaxImageNum {
					continue
				}
			}

			parts, err := buildMessageParts(req.Context(), part)
			if err != nil {
				return nil, err
			}
			content.Parts = append(content.Parts, parts...)
		}

		contents = append(contents, content)

		// Add dummy model message after system message
		if shouldAddDummyModelMessage {
			contents = append(contents, ChatContent{
				Role:  "model",
				Parts: []Part{{Text: "Okay"}},
			})
			shouldAddDummyModelMessage = false
		}
	}

	return contents, nil
}

// Setting safety to the lowest possible values since Gemini is already powerless enough
func ConvertRequest(meta *meta.Meta, req *http.Request) (http.Header, io.Reader, error) {
	textRequest, err := utils.UnmarshalGeneralOpenAIRequest(req)
	if err != nil {
		return nil, nil, err
	}

	textRequest.Model = meta.ActualModelName
	meta.Set("stream", textRequest.Stream)

	contents, err := buildContents(textRequest, req)
	if err != nil {
		return nil, nil, err
	}

	tokenCount, err := CountTokens(req.Context(), meta, contents)
	if err != nil {
		return nil, nil, err
	}
	meta.PromptTokens = tokenCount

	// Build actual request
	geminiRequest := ChatRequest{
		Contents:         contents,
		SafetySettings:   buildSafetySettings(),
		GenerationConfig: buildGenerationConfig(textRequest),
		Tools:            buildTools(textRequest),
	}

	data, err := json.Marshal(geminiRequest)
	if err != nil {
		return nil, nil, err
	}

	return nil, bytes.NewReader(data), nil
}

func CountTokens(ctx context.Context, meta *meta.Meta, chat []ChatContent) (int, error) {
	countReq := ChatRequest{
		Contents: chat,
	}
	countData, err := json.Marshal(countReq)
	if err != nil {
		return 0, err
	}
	version := helper.AssignOrDefault(meta.Channel.Config.APIVersion, config.GetGeminiVersion())
	u := meta.Channel.BaseURL
	if u == "" {
		u = baseURL
	}
	countURL := fmt.Sprintf("%s/%s/models/%s:countTokens", u, version, meta.ActualModelName)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, countURL, bytes.NewReader(countData))
	if err != nil {
		return 0, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Goog-Api-Key", meta.Channel.Key)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	var tokenCount CountTokensResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenCount); err != nil {
		return 0, err
	}
	if tokenCount.Error != nil {
		return 0, fmt.Errorf("count tokens error: %s, code: %d, status: %s", tokenCount.Error.Message, tokenCount.Error.Code, resp.Status)
	}
	return tokenCount.TotalTokens, nil
}

type ChatResponse struct {
	Candidates     []*ChatCandidate   `json:"candidates"`
	PromptFeedback ChatPromptFeedback `json:"promptFeedback"`
}

func (g *ChatResponse) GetResponseText() string {
	if g == nil {
		return ""
	}
	if len(g.Candidates) > 0 && len(g.Candidates[0].Content.Parts) > 0 {
		return g.Candidates[0].Content.Parts[0].Text
	}
	return ""
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

func getToolCalls(candidate *ChatCandidate) []*model.Tool {
	var toolCalls []*model.Tool

	item := candidate.Content.Parts[0]
	if item.FunctionCall == nil {
		return toolCalls
	}
	argsBytes, err := json.Marshal(item.FunctionCall.Arguments)
	if err != nil {
		log.Error("getToolCalls failed: " + err.Error())
		return toolCalls
	}
	toolCall := model.Tool{
		ID:   "call_" + random.GetUUID(),
		Type: "function",
		Function: model.Function{
			Arguments: conv.BytesToString(argsBytes),
			Name:      item.FunctionCall.FunctionName,
		},
	}
	toolCalls = append(toolCalls, &toolCall)
	return toolCalls
}

func responseGeminiChat2OpenAI(response *ChatResponse) *openai.TextResponse {
	fullTextResponse := openai.TextResponse{
		ID:      "chatcmpl-" + random.GetUUID(),
		Object:  "chat.completion",
		Created: helper.GetTimestamp(),
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
			if candidate.Content.Parts[0].FunctionCall != nil {
				choice.Message.ToolCalls = getToolCalls(candidate)
			} else {
				choice.Message.Content = candidate.Content.Parts[0].Text
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
	var choice openai.ChatCompletionsStreamResponseChoice
	choice.Delta.Content = geminiResponse.GetResponseText()
	// choice.FinishReason = &constant.StopFinishReason
	var response openai.ChatCompletionsStreamResponse
	response.ID = "chatcmpl-" + random.GetUUID()
	response.Created = helper.GetTimestamp()
	response.Object = "chat.completion.chunk"
	response.Model = meta.OriginModelName
	response.Choices = []*openai.ChatCompletionsStreamResponseChoice{&choice}
	return &response
}

func StreamHandler(meta *meta.Meta, c *gin.Context, resp *http.Response) (*model.Usage, *model.ErrorWithStatusCode) {
	defer resp.Body.Close()

	log := middleware.GetLogger(c)

	responseText := strings.Builder{}
	respContent := []ChatContent{}
	scanner := bufio.NewScanner(resp.Body)
	scanner.Split(bufio.ScanLines)

	common.SetEventStreamHeaders(c)

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
		for _, candidate := range geminiResponse.Candidates {
			respContent = append(respContent, candidate.Content)
		}
		response := streamResponseGeminiChat2OpenAI(meta, &geminiResponse)
		if response == nil {
			continue
		}

		responseText.WriteString(response.Choices[0].Delta.StringContent())

		err = render.ObjectData(c, response)
		if err != nil {
			log.Error("error rendering stream response: " + err.Error())
		}
	}

	if err := scanner.Err(); err != nil {
		log.Error("error reading stream: " + err.Error())
	}

	render.Done(c)

	usage := model.Usage{
		PromptTokens: meta.PromptTokens,
	}

	tokenCount, err := CountTokens(c.Request.Context(), meta, respContent)
	if err != nil {
		log.Error("count tokens failed: " + err.Error())
		usage.CompletionTokens = openai.CountTokenText(responseText.String(), meta.ActualModelName)
	} else {
		usage.CompletionTokens = tokenCount
	}
	usage.TotalTokens = usage.PromptTokens + usage.CompletionTokens
	return &usage, nil
}

func Handler(meta *meta.Meta, c *gin.Context, resp *http.Response) (*model.Usage, *model.ErrorWithStatusCode) {
	defer resp.Body.Close()

	log := middleware.GetLogger(c)

	var geminiResponse ChatResponse
	err := json.NewDecoder(resp.Body).Decode(&geminiResponse)
	if err != nil {
		return nil, openai.ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError)
	}
	if len(geminiResponse.Candidates) == 0 {
		return nil, openai.ErrorWrapperWithMessage("No candidates returned", "gemini_error", resp.StatusCode)
	}
	fullTextResponse := responseGeminiChat2OpenAI(&geminiResponse)
	fullTextResponse.Model = meta.OriginModelName
	respContent := []ChatContent{}
	for _, candidate := range geminiResponse.Candidates {
		respContent = append(respContent, candidate.Content)
	}

	usage := model.Usage{
		PromptTokens: meta.PromptTokens,
	}
	tokenCount, err := CountTokens(c.Request.Context(), meta, respContent)
	if err != nil {
		log.Error("count tokens failed: " + err.Error())
		usage.CompletionTokens = openai.CountTokenText(geminiResponse.GetResponseText(), meta.ActualModelName)
	} else {
		usage.CompletionTokens = tokenCount
	}
	usage.TotalTokens = usage.PromptTokens + usage.CompletionTokens
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
