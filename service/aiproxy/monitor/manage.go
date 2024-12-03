package monitor

import (
	"net/http"
	"strings"

	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/relay/model"
)

func ShouldDisableChannel(err *model.Error, statusCode int) bool {
	if !config.GetAutomaticDisableChannelEnabled() {
		return false
	}
	if err == nil {
		return false
	}
	if statusCode == http.StatusUnauthorized {
		return true
	}
	switch err.Type {
	case "insufficient_quota", "authentication_error", "permission_error", "forbidden":
		return true
	}
	if err.Code == "invalid_api_key" || err.Code == "account_deactivated" {
		return true
	}

	lowerMessage := strings.ToLower(err.Message)
	if strings.Contains(lowerMessage, "your access was terminated") ||
		strings.Contains(lowerMessage, "violation of our policies") ||
		strings.Contains(lowerMessage, "your credit balance is too low") ||
		strings.Contains(lowerMessage, "organization has been disabled") ||
		strings.Contains(lowerMessage, "credit") ||
		strings.Contains(lowerMessage, "balance") ||
		strings.Contains(lowerMessage, "permission denied") ||
		strings.Contains(lowerMessage, "organization has been restricted") || // groq
		strings.Contains(lowerMessage, "已欠费") {
		return true
	}
	return false
}

func ShouldEnableChannel(err error, openAIErr *model.Error) bool {
	if !config.GetAutomaticEnableChannelWhenTestSucceedEnabled() {
		return false
	}
	if err != nil {
		return false
	}
	if openAIErr != nil {
		return false
	}
	return true
}
