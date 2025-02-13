package model

import "strings"

type Message struct {
	Content          any     `json:"content,omitempty"`
	ReasoningContent string  `json:"reasoning_content,omitempty"`
	Name             *string `json:"name,omitempty"`
	Role             string  `json:"role,omitempty"`
	ToolCallID       string  `json:"tool_call_id,omitempty"`
	ToolCalls        []*Tool `json:"tool_calls,omitempty"`
}

func (m *Message) IsStringContent() bool {
	_, ok := m.Content.(string)
	return ok
}

func (m *Message) ToStringContentMessage() {
	if m.IsStringContent() {
		return
	}
	m.Content = m.StringContent()
}

func (m *Message) StringContent() string {
	if m.ReasoningContent != "" {
		return m.ReasoningContent
	}

	content, ok := m.Content.(string)
	if ok {
		return content
	}
	contentList, ok := m.Content.([]any)
	if !ok {
		return ""
	}

	var strBuilder strings.Builder
	for _, contentItem := range contentList {
		contentMap, ok := contentItem.(map[string]any)
		if !ok {
			continue
		}
		if contentMap["type"] == ContentTypeText {
			if subStr, ok := contentMap["text"].(string); ok {
				strBuilder.WriteString(subStr)
				strBuilder.WriteString("\n")
			}
		}
	}
	return strBuilder.String()
}

func (m *Message) ParseContent() []MessageContent {
	var contentList []MessageContent
	content, ok := m.Content.(string)
	if ok {
		contentList = append(contentList, MessageContent{
			Type: ContentTypeText,
			Text: content,
		})
		return contentList
	}
	anyList, ok := m.Content.([]any)
	if ok {
		for _, contentItem := range anyList {
			contentMap, ok := contentItem.(map[string]any)
			if !ok {
				continue
			}
			switch contentMap["type"] {
			case ContentTypeText:
				if subStr, ok := contentMap["text"].(string); ok {
					contentList = append(contentList, MessageContent{
						Type: ContentTypeText,
						Text: subStr,
					})
				}
			case ContentTypeImageURL:
				if subObj, ok := contentMap["image_url"].(map[string]any); ok {
					contentList = append(contentList, MessageContent{
						Type: ContentTypeImageURL,
						ImageURL: &ImageURL{
							URL: subObj["url"].(string),
						},
					})
				}
			}
		}
		return contentList
	}
	return nil
}

type ImageURL struct {
	URL    string `json:"url,omitempty"`
	Detail string `json:"detail,omitempty"`
}

type MessageContent struct {
	ImageURL *ImageURL `json:"image_url,omitempty"`
	Type     string    `json:"type,omitempty"`
	Text     string    `json:"text"`
}
