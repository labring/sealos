// Copyright © 2024 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package usernotify

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/labring/sealos/controllers/pkg/types"
)

// DefaultContentGenerator 默认内容生成器
type DefaultContentGenerator struct {
	config map[NotificationMethod]ProviderConfig
}

// NewDefaultContentGenerator 创建默认内容生成器
func NewDefaultContentGenerator(config map[NotificationMethod]ProviderConfig) *DefaultContentGenerator {
	return &DefaultContentGenerator{config: config}
}

// GenerateContent 生成通知内容
func (g *DefaultContentGenerator) GenerateContent(event *NotificationEvent, method NotificationMethod) (title, content, templateID string, err error) {
	switch event.EventType {
	case EventTypeDebtStatusChange:
		return g.generateDebtContent(method, event.EventData, event.Recipient)
	case EventTypeSubscriptionStatusChange, EventTypeSubscriptionOperationDone, EventTypeSubscriptionPaymentDone, EventTypeWorkspaceSubscriptionCreatedSuccess,
		EventTypeWorkspaceSubscriptionCreatedFailed, EventTypeWorkspaceSubscriptionUpgradedSuccess, EventTypeWorkspaceSubscriptionUpgradedFailed,
		EventTypeWorkspaceSubscriptionRenewedSuccess, EventTypeWorkspaceSubscriptionRenewedBalanceFallback, EventTypeWorkspaceSubscriptionRenewedFailed,
		EventTypeWorkspaceSubscriptionDebt, EventTypeWorkspaceSubscriptionDebtPreDeletion:
		return g.generateWorkspaceSubscriptionContent(method, event)
	case EventTypeTrafficStatusChange, EventTypeTrafficUsageAlert:
		return g.generateTrafficContent(method, event.EventData, event.Recipient)
	case EventTypeCustom:
		return g.generateCustomContent(method, event.EventData, event.Recipient)
	default:
		return "", "", "", fmt.Errorf("unsupported event type: %s", event.EventType)
	}
}

// generateDebtContent 生成债务相关通知内容
func (g *DefaultContentGenerator) generateDebtContent(method NotificationMethod, eventData map[string]interface{}, recipient types.NotificationRecipient) (title, content, templateID string, err error) {
	var debtData DebtEventData
	dataBytes, _ := json.Marshal(eventData)
	if err := json.Unmarshal(dataBytes, &debtData); err != nil {
		return "", "", "", fmt.Errorf("failed to parse debt event data: %v", err)
	}

	// 获取模板ID
	if config, exists := g.config[method]; exists {
		templateID = config.GetVMSTemplateID(EventTypeDebtStatusChange)
		if method == NotificationMethodSMS {
			templateID = config.GetSMSTemplateCode(EventTypeDebtStatusChange)
		} else if method == NotificationMethodEmail {
			templateID = config.GetEmailTemplate(EventTypeDebtStatusChange)
		}
	}

	switch debtData.CurrentStatus {
	case types.DebtPeriod:
		if debtData.LastStatus != types.DebtPeriod {
			// 首次进入欠费状态
			title = "账户欠费通知"
			content = g.formatContent(method, "尊敬的{{.UserName}}，您的账户余额不足，请及时充值以避免服务中断。", map[string]interface{}{
				"UserName": recipient.UserName,
			})
		}
	case types.DebtDeletionPeriod:
		title = "账户欠费警告"
		content = g.formatContent(method, "尊敬的{{.UserName}}，您的账户已欠费{{.DebtDays}}天，请尽快充值以避免服务中断。", map[string]interface{}{
			"UserName": recipient.UserName,
			"DebtDays": debtData.DebtDays,
		})
	case types.FinalDeletionPeriod:
		title = "资源清理预警"
		content = g.formatContent(method, "尊敬的{{.UserName}}，您的账户已欠费{{.DebtDays}}天，系统将在24小时内进行资源清理，请立即充值！", map[string]interface{}{
			"UserName": recipient.UserName,
			"DebtDays": debtData.DebtDays,
		})
	case types.NormalPeriod:
		if debtData.LastStatus != types.NormalPeriod {
			// 恢复正常状态
			title = "账户恢复通知"
			content = g.formatContent(method, "尊敬的{{.UserName}}，您的账户已恢复正常，感谢您的及时充值。", map[string]interface{}{
				"UserName": recipient.UserName,
			})
		}
	default:
		return "", "", "", fmt.Errorf("unsupported debt status: %s", debtData.CurrentStatus)
	}

	return title, content, templateID, nil
}

func (g *DefaultContentGenerator) generateWorkspaceSubscriptionContent(method NotificationMethod, event *NotificationEvent) (title, content, templateID string, err error) {
	var subData WorkspaceSubscriptionEventData
	dataBytes, _ := json.Marshal(event.EventData)
	if err := json.Unmarshal(dataBytes, &subData); err != nil {
		return "", "", "", fmt.Errorf("failed to parse subscription event data: %v", err)
	}

	// 获取模板ID
	if config, exists := g.config[method]; exists {
		templateID = config.GetVMSTemplateID(EventTypeSubscriptionOperationDone)
		if method == NotificationMethodSMS {
			templateID = config.GetSMSTemplateCode(EventTypeSubscriptionOperationDone)
		} else if method == NotificationMethodEmail {
			templateID, err = config.GenerateEmailContent(event)
			if err != nil {
				return "", "", "", fmt.Errorf("failed to generate email content: %v", err)
			}
		}
	}

	var contentTmpl string
	switch event.EventType {
	case EventTypeWorkspaceSubscriptionCreatedSuccess:
		title = "Workspace Subscription Created Successfully"
		contentTmpl = "尊敬的{{.UserName}}，您的工作空间 {{.PlanName}} 订阅已成功创建。"
		contentTmpl = "Dear {{.UserName}}, your workspace subscription for {{.PlanName}} has been successfully created."
	case EventTypeWorkspaceSubscriptionCreatedFailed:
		title = "Workspace Subscription Creation Failed"
		contentTmpl = "尊敬的{{.UserName}}，您的{{.PlanName}}订阅创建失败，原因：{{.ErrorReason}}。"
		contentTmpl = "Dear {{.UserName}}, your subscription for {{.PlanName}} failed to be created. Reason: {{.ErrorReason}}."
	case EventTypeWorkspaceSubscriptionUpgradedSuccess:
		title = "Workspace Subscription Upgraded Successfully"
		contentTmpl = "尊敬的{{.UserName}}，您的{{.PlanName}}订阅已成功升级。"
		contentTmpl = "Dear {{.UserName}}, your subscription for {{.PlanName}} has been successfully upgraded."
	case EventTypeWorkspaceSubscriptionUpgradedFailed:
		title = "Workspace Subscription Upgrade Failed"
		contentTmpl = "尊敬的{{.UserName}}，您的{{.PlanName}}订阅升级失败，原因：{{.ErrorReason}}。"
		contentTmpl = "Dear {{.UserName}}, your subscription upgrade for {{.PlanName}} failed. Reason: {{.ErrorReason}}."
	case EventTypeWorkspaceSubscriptionRenewedSuccess:
		title = "Workspace Subscription Renewed Successfully"
		contentTmpl = "尊敬的{{.UserName}}，您的{{.PlanName}}订阅已成功续订。"
		contentTmpl = "Dear {{.UserName}}, your subscription for {{.PlanName}} has been successfully renewed."
	case EventTypeWorkspaceSubscriptionRenewedBalanceFallback:
		title = "Workspace Subscription Renewed with Balance Fallback"
		contentTmpl = "尊敬的{{.UserName}}，您的{{.PlanName}}订阅续订因余额不足已切换至备用支付方式。"
		contentTmpl = "Dear {{.UserName}}, your subscription for {{.PlanName}} has been renewed using your balance due to insufficient funds."
	case EventTypeWorkspaceSubscriptionRenewedFailed:
		title = "Workspace Subscription Renewal Failed"
		contentTmpl = "尊敬的{{.UserName}}，您的{{.PlanName}}订阅续订失败，原因：{{.ErrorReason}}。"
		contentTmpl = "Dear {{.UserName}}, your subscription renewal for {{.PlanName}} failed. Reason: {{.ErrorReason}}."
	case EventTypeWorkspaceSubscriptionDebt, EventTypeWorkspaceSubscriptionDebtPreDeletion:
		title = "Workspace Subscription Debt Notice"
		contentTmpl = "尊敬的{{.UserName}}，您的工作空间{{.Workspace}}订阅已进入欠费状态，请及时充值以避免服务中断。"
		contentTmpl = "Dear {{.UserName}}, your workspace subscription for {{.Workspace}} is in debt status. Please recharge promptly to avoid service interruption."
	}
	content = g.formatContent(method, contentTmpl, map[string]interface{}{
		"UserName":    event.Recipient.UserName,
		"PlanName":    subData.NewPlanName,
		"ErrorReason": subData.ErrorReason,
		"Workspace":   subData.WorkspaceName,
		"Amount":      subData.Amount,
		"Domain":      subData.Domain,
	})
	return title, content, templateID, nil
}

// generateTrafficContent 生成流量相关通知内容
func (g *DefaultContentGenerator) generateTrafficContent(method NotificationMethod, eventData map[string]interface{}, recipient types.NotificationRecipient) (title, content, templateID string, err error) {
	var trafficData WorkspaceSubscriptionTrafficEventData
	dataBytes, _ := json.Marshal(eventData)
	if err := json.Unmarshal(dataBytes, &trafficData); err != nil {
		return "", "", "", fmt.Errorf("failed to parse traffic event data: %v", err)
	}

	// 获取模板ID
	if config, exists := g.config[method]; exists {
		templateID = config.GetVMSTemplateID(EventTypeTrafficStatusChange)
		if method == NotificationMethodSMS {
			templateID = config.GetSMSTemplateCode(EventTypeTrafficStatusChange)
		} else if method == NotificationMethodEmail {
			templateID = config.GetEmailTemplate(EventTypeTrafficStatusChange)
		}
	}

	switch trafficData.Status {
	case /*types.WorkspaceTrafficStatusExhausted,*/ types.WorkspaceTrafficStatusUsedUp:
		title = "流量已用尽"
		content = g.formatContent(method, "尊敬的{{.UserName}}，您的工作空间{{.Workspace}}流量已用尽，请及时购买流量包。", map[string]interface{}{
			"UserName":  recipient.UserName,
			"Workspace": trafficData.Workspace,
		})
	default:
		if trafficData.UsagePercent >= 80 {
			title = "流量预警"
			content = g.formatContent(method, "尊敬的{{.UserName}}，您的工作空间{{.Workspace}}流量使用已达到{{.UsagePercent}}%，请注意控制使用。", map[string]interface{}{
				"UserName":     recipient.UserName,
				"Workspace":    trafficData.Workspace,
				"UsagePercent": trafficData.UsagePercent,
			})
		}
	}

	return title, content, templateID, nil
}

// generateCustomContent 生成自定义通知内容
func (g *DefaultContentGenerator) generateCustomContent(method NotificationMethod, eventData map[string]interface{}, recipient types.NotificationRecipient) (title, content, templateID string, err error) {
	var customData CustomEventData
	dataBytes, _ := json.Marshal(eventData)
	if err := json.Unmarshal(dataBytes, &customData); err != nil {
		return "", "", "", fmt.Errorf("failed to parse custom event data: %v", err)
	}

	// 获取模板ID
	if config, exists := g.config[method]; exists {
		templateID = config.GetVMSTemplateID(EventTypeCustom)
		if method == NotificationMethodSMS {
			templateID = config.GetSMSTemplateCode(EventTypeCustom)
		} else if method == NotificationMethodEmail {
			templateID = config.GetEmailTemplate(EventTypeCustom)
		}
	}

	title = customData.Title
	content = g.formatContent(method, customData.Content, map[string]interface{}{
		"UserName": recipient.UserName,
	})

	// 合并额外数据
	if customData.ExtraData != nil {
		for key, value := range customData.ExtraData {
			placeholder := fmt.Sprintf("{{.%s}}", key)
			content = strings.ReplaceAll(content, placeholder, fmt.Sprintf("%v", value))
		}
	}

	return title, content, templateID, nil
}

// formatContent 格式化内容，根据不同的通知方式进行适配
func (g *DefaultContentGenerator) formatContent(method NotificationMethod, template string, data map[string]interface{}) string {
	content := template

	// 基本参数替换
	for key, value := range data {
		placeholder := fmt.Sprintf("{{.%s}}", key)
		content = strings.ReplaceAll(content, placeholder, fmt.Sprintf("%v", value))
	}

	// 根据通知方式进行内容适配
	switch method {
	case NotificationMethodSMS:
		// SMS内容简化，确保在短信字数限制内
		content = g.simplifySMSContent(content)
	case NotificationMethodEmail:
		// Email可以包含更丰富的内容和格式
		content = g.enrichEmailContent(content)
	case NotificationMethodVMS:
		// VMS需要语音友好的内容
		content = g.optimizeVMSContent(content)
	}

	return content
}

// simplifySMSContent 简化SMS内容
func (g *DefaultContentGenerator) simplifySMSContent(content string) string {
	// 移除敬语，简化表达
	content = strings.ReplaceAll(content, "尊敬的", "")
	content = strings.ReplaceAll(content, "请及时", "请")
	content = strings.ReplaceAll(content, "以避免服务中断", "")
	return content
}

// enrichEmailContent 丰富Email内容
func (g *DefaultContentGenerator) enrichEmailContent(content string) string {
	// Email可以添加更多详细信息和格式
	return content + "\n\n如有疑问，请联系技术支持。\n\n此邮件由Sealos系统自动发送，请勿回复。"
}

// optimizeVMSContent 优化VMS语音内容
func (g *DefaultContentGenerator) optimizeVMSContent(content string) string {
	// 语音内容需要更加口语化，去除标点符号
	content = strings.ReplaceAll(content, "，", "，停顿，")
	content = strings.ReplaceAll(content, "。", "。")
	content = strings.ReplaceAll(content, "%", "百分之")
	return content
}
