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
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strconv"
	"strings"
	"time"

	openapi "github.com/alibabacloud-go/darabonba-openapi/v2/client"
	dysmsapi20170525 "github.com/alibabacloud-go/dysmsapi-20170525/v3/client"
	util "github.com/alibabacloud-go/tea-utils/v2/service"
	"github.com/alibabacloud-go/tea/tea"
	"github.com/go-gomail/gomail"
	"github.com/sirupsen/logrus"
	"github.com/volcengine/volc-sdk-golang/service/vms"
)

// BaseProvider 基础通知提供者
type BaseProvider struct {
	Name      string
	Available bool
	Config    ProviderConfig
}

func (p *BaseProvider) GetName() string {
	return p.Name
}

func (p *BaseProvider) IsAvailable() bool {
	return p.Available && p.Config.IsEnabled
}

func (p *BaseProvider) GetSupportedMethods() []NotificationMethod {
	switch p.Name {
	case "vms":
		return []NotificationMethod{NotificationMethodVMS}
	case "email":
		return []NotificationMethod{NotificationMethodEmail}
	case "sms":
		return []NotificationMethod{NotificationMethodSMS}
	default:
		return []NotificationMethod{}
	}
}

// VMSProvider 火山语音通知提供者
type VMSProvider struct {
	BaseProvider
}

// NewVMSProvider 创建VMS提供者
func NewVMSProvider(config ProviderConfig) *VMSProvider {
	provider := &VMSProvider{
		BaseProvider: BaseProvider{
			Name:      "vms",
			Available: false,
			Config:    config,
		},
	}

	// 检查配置是否完整
	if config.VMSAPIKey == "" || config.VMSAPISecret == "" {
		log.Printf("VMS provider configuration incomplete, disabling provider")
		return provider
	}

	provider.Available = true
	log.Printf("VMS provider initialized successfully")
	return provider
}

func (p *VMSProvider) Send(
	ctx context.Context,
	message *NotificationMessage,
) (*NotificationResult, error) {
	if !p.IsAvailable() {
		return nil, errors.New("VMS provider is not available")
	}

	if message.Recipient.PhoneNumber == "" {
		return nil, errors.New("phone number is required for VMS notification")
	}

	result := &NotificationResult{
		UserUID:   message.UserUID,
		EventType: message.EventType,
		Method:    message.Method,
		SentAt:    time.Now(),
	}

	// 实际发送VMS通知
	log.Printf("Sending VMS notification to %s: %s", message.Recipient.PhoneNumber, message.Title)

	// 构建VMS参数，包括模板变量
	phoneParam := make(map[string]any)
	if message.EventData != nil {
		// 根据事件数据构建phone参数
		if workspaceName, ok := message.EventData["workspace_name"]; ok {
			phoneParam["workspace_name"] = workspaceName
		}
		if usedPercentage, ok := message.EventData["used_percentage"]; ok {
			phoneParam["used_percentage"] = usedPercentage
		}
		// 可以添加更多参数映射
	}

	var paramList []*vms.SingleParam
	param := &vms.SingleParam{
		Phone:        message.Recipient.PhoneNumber,
		Type:         1,
		TriggerTime:  &vms.JsonTime{Time: result.SentAt},
		Resource:     message.TemplateID, // 使用TemplateID作为Resource
		NumberPoolNo: p.Config.VMSNumberPool,
		SingleOpenId: message.Recipient.PhoneNumber + "-" + result.SentAt.Format(time.DateOnly),
	}

	// 如果有参数，添加PhoneParam
	if len(phoneParam) > 0 {
		param.PhoneParam = phoneParam
	}

	paramList = append(paramList, param)

	req := &vms.SingleAppendRequest{
		List: paramList,
	}

	// 发送VMS
	vmResult, statusCode, err := vms.DefaultInstance.SingleBatchAppend(req)
	if err != nil {
		result.Success = false
		result.Error = fmt.Sprintf("failed to send VMS: %v", err)
		return result, err
	}

	if vmResult.ResponseMetadata.Error != nil {
		result.Success = false
		result.Error = fmt.Sprintf("VMS API error: %v", vmResult.ResponseMetadata.Error)
		return result, fmt.Errorf("VMS API error: %v", vmResult.ResponseMetadata.Error)
	}

	if statusCode != 200 {
		result.Success = false
		result.Error = fmt.Sprintf("VMS failed with status code: %d", statusCode)
		return result, fmt.Errorf("VMS failed with status code: %d", statusCode)
	}

	// 构建响应数据
	responseData := map[string]any{
		"template_id":    message.TemplateID,
		"phone":          message.Recipient.PhoneNumber,
		"title":          message.Title,
		"content":        message.Content,
		"sent_at":        result.SentAt,
		"provider":       "vms",
		"status_code":    statusCode,
		"vms_result":     vmResult.Result,
		"single_open_id": paramList[0].SingleOpenId,
		"phone_param":    phoneParam, // 记录传递的模板参数
	}

	if responseBytes, err := json.Marshal(responseData); err == nil {
		result.ProviderResponse = string(responseBytes)
	}

	result.Success = true
	log.Printf(
		"VMS notification sent successfully to %s, status: %d",
		message.Recipient.PhoneNumber,
		statusCode,
	)
	return result, nil
}

// EmailProvider 邮箱通知提供者
type EmailProvider struct {
	BaseProvider
}

// NewEmailProvider 创建Email提供者
func NewEmailProvider(config ProviderConfig) *EmailProvider {
	provider := &EmailProvider{
		BaseProvider: BaseProvider{
			Name:      "email",
			Available: false,
			Config:    config,
		},
	}

	// 检查配置是否完整
	if config.SMTPHost == "" || config.SMTPUsername == "" || config.SMTPPassword == "" ||
		config.FromEmail == "" {
		log.Printf("Email provider configuration incomplete, disabling provider")
		return provider
	}

	provider.Available = true
	log.Printf("Email provider initialized successfully")
	return provider
}

func (p *EmailProvider) Send(
	ctx context.Context,
	message *NotificationMessage,
) (*NotificationResult, error) {
	if !p.IsAvailable() {
		return nil, errors.New("email provider is not available")
	}

	if message.Recipient.Email == "" {
		return nil, errors.New("email address is required for email notification")
	}

	result := &NotificationResult{
		UserUID:   message.UserUID,
		EventType: message.EventType,
		Method:    message.Method,
		SentAt:    time.Now(),
	}

	// 实际发送邮件通知
	log.Printf("Sending email notification to %s: %s", message.Recipient.Email, message.Title)

	// 确定邮件内容：优先使用HTML模板，否则使用简单内容
	var emailContent string
	if message.TemplateID != "" {
		// 使用HTML模板并替换变量
		// emailContent = p.renderEmailTemplate(message.TemplateID, message.Content, message.EventData, message.Recipient)
		emailContent = message.TemplateID
	} else {
		// 退回到使用简单内容，包装为基本HTML
		emailContent = p.wrapSimpleContent(message.Content)
	}

	// 构建邮件消息
	m := gomail.NewMessage()
	m.SetHeader("To", message.Recipient.Email)
	m.SetAddressHeader("From", p.Config.FromEmail, p.Config.FromName)
	m.SetHeader("Subject", message.Title)
	m.SetBody("text/html", emailContent)

	// 创建邮件发送器
	d := gomail.NewDialer(
		p.Config.SMTPHost,
		p.Config.SMTPPort,
		p.Config.SMTPUsername,
		p.Config.SMTPPassword,
	)

	// 发送邮件
	if err := d.DialAndSend(m); err != nil {
		result.Success = false
		result.Error = fmt.Sprintf("failed to send email: %v", err)
		return result, fmt.Errorf("failed to send email: %w", err)
	}

	// 构建响应数据
	responseData := map[string]any{
		"template_id": message.TemplateID,
		"email":       message.Recipient.Email,
		"subject":     message.Title,
		"content":     message.Content,
		"sent_at":     result.SentAt,
		"provider":    "email",
		"smtp_host":   p.Config.SMTPHost,
		"smtp_port":   p.Config.SMTPPort,
		"from_email":  p.Config.FromEmail,
	}

	if responseBytes, err := json.Marshal(responseData); err == nil {
		result.ProviderResponse = string(responseBytes)
	}

	result.Success = true
	log.Printf("Email notification sent successfully to %s", message.Recipient.Email)
	return result, nil
}

// renderEmailTemplate 渲染邮件HTML模板并替换变量
// func (p *EmailProvider) renderEmailTemplate(
//	templateContent, content string,
//	eventData map[string]any,
//	recipient types.NotificationRecipient,
// ) string {
//	renderedTemplate := templateContent
//
//	// 基本变量替换
//	renderedTemplate = strings.ReplaceAll(renderedTemplate, "{{.content}}", content)
//	renderedTemplate = strings.ReplaceAll(renderedTemplate, "{{.UserName}}", recipient.UserName)
//
//	// 替换事件数据中的变量
//	if eventData != nil {
//		if workspaceName, ok := eventData["workspace_name"]; ok {
//			renderedTemplate = strings.ReplaceAll(
//				renderedTemplate,
//				"{{.workspace_name}}",
//				fmt.Sprintf("%v", workspaceName),
//			)
//		}
//		if usedPercentage, ok := eventData["used_percentage"]; ok {
//			renderedTemplate = strings.ReplaceAll(
//				renderedTemplate,
//				"{{.used_percentage}}",
//				fmt.Sprintf("%v", usedPercentage),
//			)
//		}
//		if planName, ok := eventData["plan_name"]; ok {
//			renderedTemplate = strings.ReplaceAll(
//				renderedTemplate,
//				"{{.plan_name}}",
//				fmt.Sprintf("%v", planName),
//			)
//		}
//		if errorReason, ok := eventData["error_reason"]; ok {
//			renderedTemplate = strings.ReplaceAll(
//				renderedTemplate,
//				"{{.error_reason}}",
//				fmt.Sprintf("%v", errorReason),
//			)
//		}
//		if amount, ok := eventData["amount"]; ok {
//			renderedTemplate = strings.ReplaceAll(
//				renderedTemplate,
//				"{{.amount}}",
//				fmt.Sprintf("%v", amount),
//			)
//		}
//		if expireDays, ok := eventData["expire_days"]; ok {
//			renderedTemplate = strings.ReplaceAll(
//				renderedTemplate,
//				"{{.expire_days}}",
//				fmt.Sprintf("%v", expireDays),
//			)
//		}
//
//		// 处理其他动态变量
//		for key, value := range eventData {
//			placeholder := fmt.Sprintf("{{.%s}}", key)
//			renderedTemplate = strings.ReplaceAll(
//				renderedTemplate,
//				placeholder,
//				fmt.Sprintf("%v", value),
//			)
//		}
//	}
//
//	return renderedTemplate
//}

type EmailData struct {
	UserName       string
	Title          string
	AlertMessage   string
	Content        string
	WarnContent    string
	BorderColor    string
	PlanDetails    *PlanDetails // Optional
	Recommendation string       // Optional
}

// PlanDetails represents the plan card details
type PlanDetails struct {
	Title    string
	Dates    string
	Location string
	Features []string
}

const WorkspaceSubscriptionEventEmailRenderTmpl = `<!DOCTYPE html>
<html lang="en" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px;">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sealos - {{.Title}}</title>
    </head>
    <body style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px;">
        <table class="container" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; width: 100%; max-width: 600px; margin: 0 auto; color: #333; background-color: #fff; border: 1px solid {{.BorderColor}};">
            <tr>
                <td>
                    <table class="header" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; text-align: left; padding: 48px; padding-bottom: 20px; border-bottom: 1px dashed #e5e5e5; width: 100%;">
                        <tr>
                            <td>
                                <table class="logo-table" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; width: 100%; margin-bottom: 8px;">
                                    <tr>
                                        <td class="logo-cell" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; text-align: left; vertical-align: middle;">
                                            <div class="logo-icon" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; width: 40px; height: 40px; display: inline-block; vertical-align: middle; margin-right: 12px;">
                                                <img src="https://objectstorageapi.usw.sealos.io/3n31wssp-sealos-assets/sealos-logo@128.png" width="40" height="40" alt="Sealos Logo" style="box-sizing: border-box; font-family: system-ui, sans-serif; font-weight: normal; letter-spacing: 0.25px;">
                                            </div>
                                            <span class="logo-text" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 32px; font-weight: 600; margin: 0; color: #333; display: inline-block; vertical-align: middle;">Sealos</span>
                                        </td>
                                    </tr>
                                </table>
                                <p class="tagline" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 14px; color: #888; margin: 0;">
                                    Application-Centric Intelligent Cloud Operating System
                                </p>
                            </td>
                        </tr>
                    </table>

                    <table class="main-content" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; padding: 48px; padding-top: 0;">
                        <tr>
                            <td>
                                <h2 class="greeting" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 24px; font-weight: 600; margin: 48px 0 12px 0; color: #333;">Hi {{.UserName}},</h2>

                                <p class="alert-message" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 16px; margin-bottom: 16px; color: #333;">
                                    {{.AlertMessage}}
                                </p>
								{{if .WarnContent}}
								<p class="alert-message" style="font-family: Arial, Helvetica, sans-serif;letter-spacing: 0.25px; font-size: 16px; margin-bottom: 32px; color: #dc2626; background-color: #fef2f2; border-radius: 8px; line-height: 1.44; padding: 16px;">
									{{.WarnContent}}
								</p>
								{{else}}{{if .Content}}
                                <p class="details" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 16px; margin-bottom: 32px; color: #333;">
                                    {{.Content}}
                                </p>
								{{end}}
								{{end}}

                                {{if .PlanDetails}}
                                <table class="plan-card" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; background: #fff; border: 1px solid #e5e5e5; padding: 24px; margin-bottom: 32px; width: 100%; border-radius: 16px;">
                                    <tr>
                                        <td>
                                            <table class="plan-header-table" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; width: 100%; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #f0f0f0;">
                                                <tr>
                                                    <td class="plan-title-cell" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; text-align: left; vertical-align: top;">
                                                        <h3 class="plan-title" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 24px; font-weight: 600; margin: 0; margin-bottom: 8px; color: #333;">{{.PlanDetails.Title}}</h3>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td class="plan-info-cell" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; text-align: right; vertical-align: top;">
                                                        <div class="plan-dates" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 14px; color: #888; margin-bottom: 4px; text-align: start;">
                                                            {{.PlanDetails.Dates}}
                                                        </div>
                                                    </td>
                                                    <td class="plan-info-cell" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; text-align: right; vertical-align: top;">
                                                        <div class="plan-location" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 14px; color: #888;">{{.PlanDetails.Location}}</div>
                                                    </td>
                                                </tr>
                                            </table>

                                            <div class="plan-features" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; margin-bottom: 24px;">
                                                {{range .PlanDetails.Features}}
                                                <table class="feature-table" cellpadding="0" cellspacing="0" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; width: 100%; margin-bottom: 12px;">
                                                    <tr>
                                                        <td class="checkmark-cell" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; width: 32px; vertical-align: middle;">
                                                            <div class="checkmark" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; width: 16px; height: 16px; background: white; color: #2563EB; text-align: center; vertical-align: bottom; padding-top: 2px; padding-bottom: 1px; padding-left: 1px; padding-right: 2px; border: 2px solid #2563EB; border-radius: 9999px; font-size: 12px; font-weight: 600;">✓</div>
                                                        </td>
                                                        <td class="feature-text-cell" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; vertical-align: middle;">
                                                            <span class="feature-text" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 16px; color: #333;">{{.}}</span>
                                                        </td>
                                                    </tr>
                                                </table>
                                                {{end}}
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                                {{end}}

                                {{if .Recommendation}}
								<a class="upgrade-button" href="{{.Recommendation}}" style="font-family: Arial, Helvetica, sans-serif;letter-spacing: 0.25px;background: #000;border-radius: 8px;color: white;border: none;padding: 16px;font-size: 16px;font-weight: 600;cursor: pointer;display: block;text-align: center;">
									Upgrade Plan
								</a>
								<br/>
                                {{end}}

                                <p class="footer-support" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 16px; margin-bottom: 16px; color: #333;">
                                    Should you have any questions, feel free to contact our support team.
                                </p>
                                <p class="footer-signature" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 16px; margin-bottom: 16px; color: #333;">
                                    Best regards,<br>
                                    The Sealos Team
                                </p>
                                <p class="footer-contact" style="font-family: Arial, Helvetica, sans-serif; letter-spacing: 0.25px; font-size: 16px; margin-bottom: 32px; color: #333;">
                                    <a href="mailto:contact@sealos.io" style="color: #2563EB; text-decoration: none;">contact@sealos.io</a>
                                </p>`

// EventConfig defines the configuration for each event type
type EventConfig struct {
	TitleTemplate     string
	AlertTemplate     string
	WarnAlertTemplate string
	Content           string
	BorderColor       string
	Features          []string
	Recommendation    string
	DatesFormat       string
}

// eventConfigs maps event types to their configurations
var eventConfigs = map[EventType]EventConfig{
	EventTypeTrafficUsageAlert: {
		TitleTemplate:  "%s Region %s Workspace Resource %s",
		AlertTemplate:  "This is a heads-up that your %s resource usage in the %s region for the %s workspace has exceeded %s.",
		Content:        "To avoid any potential service disruption, please review your current usage and consider upgrading your plan.",
		BorderColor:    "#ffa500",
		Features:       []string{"4 vCPU", "4GB RAM", "1GB Disk"},
		Recommendation: "https://usw.sealos.io/?openapp=system-costcenter&region=%s&workspace=%s",
		DatesFormat:    "Until %s",
	},
	EventTypeWorkspaceSubscriptionCreatedSuccess: {
		TitleTemplate: "%s Region %s Space Subscription Created Successfully",
		AlertTemplate: `Welcome to Sealos! 
You have successfully subscribed to the %s plan for the %s space in the %s region.`,
		Content:     "Your plan is active and will automatically renew on %s.",
		BorderColor: "#e5e5e5",
		Features:    []string{"4 vCPU", "4GB RAM", "1GB Disk"},
		DatesFormat: "Until %s",
	},
	EventTypeWorkspaceSubscriptionCreatedFailed: {
		TitleTemplate:  "%s Region %s workspace Subscription Creation Failed",
		AlertTemplate:  `We were unable to process your subscription to the %s plan for the %s workspace in the %s region.`,
		Content:        "Please contact support for assistance.",
		BorderColor:    "#ff0000",
		Features:       []string{"4 vCPU", "4GB RAM", "1GB Disk"},
		Recommendation: "https://usw.sealos.io/?openapp=system-costcenter&region=%s&workspace=%s",
		DatesFormat:    "Until %s",
	},
	EventTypeWorkspaceSubscriptionRenewedSuccess: {
		TitleTemplate:  "%s Region %s Workspace Subscription Renewed",
		AlertTemplate:  `Your subscription to the %s plan for the %s workspace in the %s region has been successfully renewed.`,
		Content:        "Thank you for your continued trust in Sealos.",
		BorderColor:    "#e5e5e5",
		Features:       []string{"4 vCPU", "4GB RAM", "1GB Disk"},
		DatesFormat:    "Until %s",
		Recommendation: "https://usw.sealos.io/?openapp=system-costcenter&region=%s&workspace=%s",
	},
	EventTypeWorkspaceSubscriptionRenewedFailed: {
		TitleTemplate:  "%s Region %s Workspace Subscription Renewal Failed",
		AlertTemplate:  `We were unable to renew your %s plan for the %s workspace in the %s region. Your service will be suspended on your plan's expiration date.`,
		Content:        "To prevent service interruption and data loss, please update your payment information as soon as possible. Your resources will be permanently deleted 7 days after the expiration date of %s.",
		BorderColor:    "#ff0000",
		Features:       []string{"4 vCPU", "4GB RAM", "1GB Disk"},
		Recommendation: "https://usw.sealos.io/?openapp=system-costcenter&region=%s&workspace=%s",
		DatesFormat:    "Until %s",
	},
	// EventTypeWorkspaceSubscriptionRenewedBalanceFallback 订阅支付失败，自动使用余额支付，需要通知用户订阅支付失败，但使用cloud balance成功
	EventTypeWorkspaceSubscriptionRenewedBalanceFallback: {
		TitleTemplate:  "%s Region %s Workspace Subscription Renewed with Cloud Balance",
		AlertTemplate:  `Your subscription to the %s plan for the %s workspace in the %s region was successfully renewed using your cloud balance.Dear User, Your subscription auto-renewal has failed. However, we have successfully deducted the payment from your account balance, and your subscription has been renewed. Please check your payment method to ensure smooth auto-renewals in the future. If you have any questions, please contact our customer support.`,
		Content:        "Thank you for your continued trust in Sealos. Please ensure your payment information is up to date to avoid future interruptions.",
		BorderColor:    "#e5e5e5",
		Features:       []string{"4 vCPU", "4GB RAM", "1GB Disk"},
		DatesFormat:    "Until %s",
		Recommendation: "https://usw.sealos.io/?openapp=system-costcenter&region=%s&workspace=%s",
	},
	EventTypeWorkspaceSubscriptionExpired: {
		TitleTemplate:  "%s Region %s Workspace Subscription Expired",
		AlertTemplate:  "Your %s plan for the %s workspace in the %s region has expired, and your service is now suspended.",
		Content:        "Your resources will be permanently deleted in %d days. To restore your service and prevent data loss, please renew your subscription now.",
		BorderColor:    "#ff0000",
		Features:       []string{"4 vCPU", "4GB RAM", "1GB Disk"},
		Recommendation: "https://usw.sealos.io/?openapp=system-costcenter&region=%s&workspace=%s",
		DatesFormat:    "Until %s",
	},
	EventTypeWorkspaceSubscriptionExpiredDeleteResources: {
		TitleTemplate:  "%s Region %s Workspace Resources Deleted",
		AlertTemplate:  "As your subscription for the %s space in the %s region was not renewed within the 7-day grace period, your associated resources have now been permanently deleted.",
		Content:        "We're sorry to see you go. If you wish to use Sealos services again in the future, you can start a new subscription at any time.",
		BorderColor:    "#ff0000",
		Features:       []string{"4 vCPU", "4GB RAM", "1GB Disk"},
		Recommendation: "https://usw.sealos.io/?openapp=system-costcenter&region=%s&workspace=%s",
		DatesFormat:    "Expired on %s",
	},
	EventTypeWorkspaceSubscriptionUpgradedSuccess: {
		TitleTemplate:  "%s Region %s Workspace Subscription Upgraded",
		AlertTemplate:  "You have successfully upgraded to the %s plan! Your new plan is effective immediately for the %s workspace in the %s region.",
		Content:        "Enjoy the new features! Your plan will automatically renew on %s.",
		BorderColor:    "#e5e5e5",
		Features:       []string{"8 vCPU", "16GB RAM", "10GB Disk"},
		DatesFormat:    "Until %s",
		Recommendation: "https://usw.sealos.io/?openapp=system-costcenter&region=%s&workspace=%s",
	},
	EventTypeWorkspaceSubscriptionUpgradedFailed: {
		TitleTemplate:  "%s Region %s Workspace Subscription Upgrade Failed",
		AlertTemplate:  "We were unable to process your upgrade to the %s plan for the %s workspace in the %s region. Your subscription will remain on your current plan.",
		Content:        "Please contact support for assistance.",
		BorderColor:    "#ff0000",
		Features:       []string{"8 vCPU", "16GB RAM", "10GB Disk"},
		Recommendation: "https://usw.sealos.io/?openapp=system-costcenter&region=%s&workspace=%s",
		DatesFormat:    "Current Until %s",
	},
	EventTypeWorkspaceSubscriptionDowngradedSuccess: {
		TitleTemplate:  "%s Region %s Workspace Subscription Downgraded",
		AlertTemplate:  "You have successfully scheduled a downgrade to the %s plan for the %s workspace in the %s region.",
		Content:        "This change will take effect at the start of your next billing cycle on %s.",
		BorderColor:    "#e5e5e5",
		Features:       []string{"2 vCPU", "2GB RAM", "500MB Disk"},
		DatesFormat:    "Effective from %s",
		Recommendation: "https://usw.sealos.io/?openapp=system-costcenter&region=%s&workspace=%s",
	},
	EventTypeWorkspaceSubscriptionDowngradedFailed: {
		TitleTemplate:  "%s Region %s Workspace Subscription Downgrade Failed",
		AlertTemplate:  "We were unable to process your downgrade to the %s plan for the %s workspace in the %s region. Your subscription will remain on your current plan.",
		Content:        "Please contact support for assistance.",
		BorderColor:    "#ff0000",
		Features:       []string{"2 vCPU", "2GB RAM", "500MB Disk"},
		DatesFormat:    "Current Until %s",
		Recommendation: "https://usw.sealos.io/?openapp=system-costcenter&region=%s&workspace=%s",
	},
	EventTypeWorkspaceSubscriptionDebt: {
		TitleTemplate:     "Workspace Subscription Expiration Warning in %s Region %s Workspace",
		AlertTemplate:     "Your %s Plan for the %s workspace in the %s region has expired. Your service will be suspended on your plan's expiration date.",
		BorderColor:       "#ff0000",
		WarnAlertTemplate: "To prevent service interruption and data loss, please update your payment information as soon as possible. Your resources will be permanently deleted 7 days after the expiration date.",
		// Content:           `To prevent service interruption and data loss, please update your plan as soon as possible. Your resources will be permanently deleted 7 days after the expiration date.`,
		Content:        "Your subscription will delete in %d days. Please renew your subscription to continue enjoying our services.",
		Recommendation: "https://usw.sealos.io/?openapp=system-costcenter&region=%s&workspace=%s",
	},
}

// generateEmailContent generates email content based on the event type
func generateEmailContent(event *NotificationEvent) (*EmailData, error) {
	config, ok := eventConfigs[event.EventType]
	if !ok {
		return nil, fmt.Errorf("unsupported event type: %s", event.EventType)
	}

	var data EmailData
	data.BorderColor = config.BorderColor
	data.Content = config.Content

	switch event.EventType {
	case EventTypeTrafficUsageAlert:
		var trafficData WorkspaceSubscriptionTrafficEventData
		dataBytes, err := json.Marshal(event.EventData)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal traffic event data: %w", err)
		}
		if err := json.Unmarshal(dataBytes, &trafficData); err != nil {
			return nil, fmt.Errorf("failed to parse traffic event data: %w", err)
		}
		// Determine title suffix based on UsagePercent
		titleSuffix := "Usage Alert"
		if trafficData.UsagePercent >= 100 {
			titleSuffix = "Exhausted"
			data.Content = "Please upgrade your plan immediately to ensure continued operation."
			data.BorderColor = "#ff0000"
		}
		data.Title = fmt.Sprintf(
			config.TitleTemplate,
			trafficData.RegionDomain,
			trafficData.Workspace,
			titleSuffix,
		)
		data.AlertMessage = fmt.Sprintf(
			strings.ReplaceAll(
				config.AlertTemplate,
				`%s`,
				`<span class="region-text" style="font-family: Arial, Helvetica, sans-serif;letter-spacing: 0.25px;font-weight: 600;color: #333;">%s</span>`,
			),
			"Traffic",
			trafficData.RegionDomain,
			trafficData.Workspace,
			strconv.Itoa(trafficData.UsagePercent)+"%",
		)
		data.Recommendation = fmt.Sprintf(
			config.Recommendation,
			trafficData.RegionDomain,
			trafficData.Workspace,
		)
		data.PlanDetails = &PlanDetails{
			Title:    trafficData.PlanName,
			Dates:    fmt.Sprintf(config.DatesFormat, trafficData.ExpirationDate),
			Location: fmt.Sprintf("%s/%s", trafficData.RegionDomain, trafficData.Workspace),
			Features: trafficData.Features,
		}
		if trafficData.UsagePercent >= 100 {
			data.Content = "Please upgrade your plan immediately to ensure continued operation."
			data.BorderColor = "#ff0000"
		}
	case EventTypeWorkspaceSubscriptionDebt:
		var subData WorkspaceSubscriptionDebtEventData
		dataBytes, err := json.Marshal(event.EventData)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal subscription debt event data: %w", err)
		}
		if err := json.Unmarshal(dataBytes, &subData); err != nil {
			return nil, fmt.Errorf("failed to parse subscription debt event data: %w", err)
		}
		data.Title = fmt.Sprintf(config.TitleTemplate, subData.RegionDomain, subData.WorkspaceName)
		data.AlertMessage = fmt.Sprintf(
			config.AlertTemplate,
			subData.PlanName,
			subData.WorkspaceName,
			subData.RegionDomain,
		)
		data.Content = fmt.Sprintf(
			config.Content,
			subData.PlanName,
			subData.WorkspaceName,
			subData.RegionDomain,
		)
		data.WarnContent = config.WarnAlertTemplate
		data.Recommendation = fmt.Sprintf(
			config.Recommendation,
			subData.RegionDomain,
			subData.WorkspaceName,
		)
		data.AlertMessage = fmt.Sprintf(
			strings.ReplaceAll(
				config.AlertTemplate,
				`%s`,
				`<span class="region-text" style="font-family: Arial, Helvetica, sans-serif;letter-spacing: 0.25px;font-weight: 600;color: #333;">%s</span>`,
			),
			subData.PlanName,
			subData.WorkspaceName,
			subData.RegionDomain,
		)
		data.WarnContent = config.WarnAlertTemplate
	default:
		var subData WorkspaceSubscriptionEventData
		dataBytes, err := json.Marshal(event.EventData)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal subscription event data: %w", err)
		}
		if err := json.Unmarshal(dataBytes, &subData); err != nil {
			return nil, fmt.Errorf("failed to parse subscription event data: %w", err)
		}
		data.Title = fmt.Sprintf(config.TitleTemplate, subData.RegionDomain, subData.WorkspaceName)

		data.AlertMessage = fmt.Sprintf(
			strings.ReplaceAll(
				config.AlertTemplate,
				`%s`,
				`<span class="region-text" style="font-family: Arial, Helvetica, sans-serif;letter-spacing: 0.25px;font-weight: 600;color: #333;">%s</span>`,
			),
			subData.NewPlanName,
			subData.WorkspaceName,
			subData.RegionDomain,
		)
		data.PlanDetails = &PlanDetails{
			Title:    subData.NewPlanName,
			Dates:    fmt.Sprintf(config.DatesFormat, subData.ExpirationDate),
			Location: fmt.Sprintf("%s/%s", subData.RegionDomain, subData.WorkspaceName),
			Features: subData.Features,
		}
		if config.Recommendation != "" {
			data.Recommendation = fmt.Sprintf(
				config.Recommendation,
				subData.RegionDomain,
				subData.WorkspaceName,
			)
		}
		if event.EventType == EventTypeWorkspaceSubscriptionExpired {
			data.Content = fmt.Sprintf(config.Content, subData.DaysRemaining)
		}
		switch event.EventType {
		case EventTypeWorkspaceSubscriptionUpgradedSuccess,
			EventTypeWorkspaceSubscriptionCreatedSuccess:
			data.Content = fmt.Sprintf(config.Content, subData.NextPayDate)
		case EventTypeWorkspaceSubscriptionRenewedFailed:
			data.Content = fmt.Sprintf(config.Content, subData.NewPlanName)
		}
	}
	data.UserName = event.Recipient.UserName

	fmt.Printf("Generated Email Data: %+v\n", data)
	return &data, nil
}

// wrapSimpleContent 将简单文本内容包装为基本HTML
func (p *EmailProvider) wrapSimpleContent(content string) string {
	return fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Sealos通知</title>
    <style>
        body { font-family: 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif; margin: 20px; color: #333; line-height: 1.6; }
        .content { padding: 20px 0; }
        .footer { color: #666; font-size: 12px; margin-top: 30px; text-align: center; }
    </style>
</head>
<body>
    <div class="content">
        <p>%s</p>
    </div>
    <div class="footer">
        <p>本邮件由Sealos系统自动发送，请勿回复</p>
    </div>
</body>
</html>`, content)
}

// SMSProvider 阿里短信通知提供者
type SMSProvider struct {
	BaseProvider
}

// NewSMSProvider 创建SMS提供者
func NewSMSProvider(config ProviderConfig) *SMSProvider {
	provider := &SMSProvider{
		BaseProvider: BaseProvider{
			Name:      "sms",
			Available: false,
			Config:    config,
		},
	}

	// 检查配置是否完整
	if config.SMSAccessKeyID == "" || config.SMSAccessKeySecret == "" ||
		config.SMSDefaultTemplate == "" {
		log.Printf("SMS provider configuration incomplete, disabling provider")
		return provider
	}

	provider.Available = true
	log.Printf("SMS provider initialized successfully")
	return provider
}

func (p *SMSProvider) Send(
	ctx context.Context,
	message *NotificationMessage,
) (*NotificationResult, error) {
	if !p.IsAvailable() {
		return nil, errors.New("SMS provider is not available")
	}
	// 准备短信模板参数
	templateParam := ""
	if message.EventData != nil {
		if templateParamBytes, err := json.Marshal(message.EventData); err == nil {
			templateParam = string(templateParamBytes)
		}
	}

	if message.Recipient.PhoneNumber == "" || templateParam == "" {
		// TODO: skip null phone number or empty template param
		return nil, nil
	}

	result := &NotificationResult{
		UserUID:   message.UserUID,
		EventType: message.EventType,
		Method:    message.Method,
		SentAt:    time.Now(),
	}

	// 实际发送短信通知
	log.Printf("Sending SMS notification to %s: %s", message.Recipient.PhoneNumber, message.Title)

	// 创建阿里云SMS客户端
	config := &openapi.Config{
		AccessKeyId:     tea.String(p.Config.SMSAccessKeyID),
		AccessKeySecret: tea.String(p.Config.SMSAccessKeySecret),
		Endpoint:        tea.String(p.Config.SMSEndpoint),
	}

	client, err := dysmsapi20170525.NewClient(config)
	if err != nil {
		result.Success = false
		result.Error = fmt.Sprintf("failed to create SMS client: %v", err)
		return result, err
	}

	// 构建发送短信请求
	sendSmsRequest := &dysmsapi20170525.SendSmsRequest{
		PhoneNumbers:  tea.String(message.Recipient.PhoneNumber),
		SignName:      tea.String(p.Config.SMSSignName),
		TemplateCode:  tea.String(message.TemplateID),
		TemplateParam: tea.String(templateParam),
	}

	// 发送短信
	runtime := &util.RuntimeOptions{}
	resp, err := client.SendSmsWithOptions(sendSmsRequest, runtime)
	if err != nil {
		result.Success = false
		result.Error = fmt.Sprintf("failed to send SMS: %v", err)
		return result, err
	}

	// 检查响应结果
	if resp.Body.Code == nil || *resp.Body.Code != "OK" {
		errCode := "UNKNOWN"
		errMsg := "Unknown error"
		if resp.Body.Code != nil {
			errCode = *resp.Body.Code
		}
		if resp.Body.Message != nil {
			errMsg = *resp.Body.Message
		}
		result.Success = false
		result.Error = fmt.Sprintf("SMS send failed with code %s: %s", errCode, errMsg)
		return result, fmt.Errorf("SMS send failed with code %s: %s", errCode, errMsg)
	}

	// 构建响应数据
	responseData := map[string]any{
		"template_code":  message.TemplateID,
		"phone":          message.Recipient.PhoneNumber,
		"content":        message.Content,
		"template_param": templateParam,
		"sent_at":        result.SentAt,
		"provider":       "sms",
		"sign_name":      p.Config.SMSSignName,
		"response_code":  *resp.Body.Code,
		"request_id":     *resp.Body.RequestId,
	}

	if resp.Body.BizId != nil {
		responseData["biz_id"] = *resp.Body.BizId
	}

	if responseBytes, err := json.Marshal(responseData); err == nil {
		result.ProviderResponse = string(responseBytes)
	}

	result.Success = true
	log.Printf(
		"SMS notification sent successfully to %s, RequestId: %s",
		message.Recipient.PhoneNumber,
		*resp.Body.RequestId,
	)
	return result, nil
}

// ProviderManager 通知提供者管理器
type ProviderManager struct {
	providers       map[NotificationMethod]NotificationProvider
	contactProvider UserContactProvider
	contentGen      NotificationContentGenerator
}

// NewProviderManager 创建提供者管理器
func NewProviderManager(
	configs map[NotificationMethod]ProviderConfig,
	contactProvider UserContactProvider,
) *ProviderManager {
	manager := &ProviderManager{
		providers:       make(map[NotificationMethod]NotificationProvider),
		contactProvider: contactProvider,
		contentGen:      NewDefaultContentGenerator(configs),
	}

	// 初始化各种提供者
	if vmsConfig, exists := configs[NotificationMethodVMS]; exists {
		manager.providers[NotificationMethodVMS] = NewVMSProvider(vmsConfig)
	}

	if emailConfig, exists := configs[NotificationMethodEmail]; exists {
		manager.providers[NotificationMethodEmail] = NewEmailProvider(emailConfig)
	}

	if smsConfig, exists := configs[NotificationMethodSMS]; exists {
		manager.providers[NotificationMethodSMS] = NewSMSProvider(smsConfig)
	}

	return manager
}

// GetProvider 获取指定方法的提供者
func (m *ProviderManager) GetProvider(method NotificationMethod) (NotificationProvider, bool) {
	provider, exists := m.providers[method]
	return provider, exists
}

// GetAvailableProviders 获取所有可用的提供者
func (m *ProviderManager) GetAvailableProviders() []NotificationProvider {
	var available []NotificationProvider
	for _, provider := range m.providers {
		if provider.IsAvailable() {
			available = append(available, provider)
		}
	}
	return available
}

// SendEvent 发送事件通知
func (m *ProviderManager) SendEvent(
	ctx context.Context,
	event *NotificationEvent,
) ([]*NotificationResult, error) {
	results := make([]*NotificationResult, 0)
	var errors []string

	// 如果事件中没有接收者信息，尝试获取
	if m.contactProvider != nil {
		contact, err := m.contactProvider.GetUserContact(ctx, event.UserUID)
		if err != nil {
			return nil, fmt.Errorf("failed to get user contact: %w", err)
		} else if contact != nil {
			// 补充接收者信息
			event.Recipient = *contact
		}
	}
	logrus.Infof("recipient info: %+v", event.Recipient)

	// 为每种通知方式生成消息并发送
	for _, method := range event.Methods {
		provider, exists := m.GetProvider(method)
		if !exists {
			// TODO 临时去掉
			// return nil, fmt.Errorf("failed to get provider for method: %s", method)
			continue
		}

		if !provider.IsAvailable() {
			errors = append(errors, fmt.Sprintf("provider %s is not available", provider.GetName()))
			continue
		}
		switch provider.GetName() {
		case "email":
			if event.Recipient.Email == "" && !event.NotIgnoreIfNoContact {
				// return nil, fmt.Errorf("email required for email notification")
				continue
			}
		case "sms", "vms":
			if event.Recipient.PhoneNumber == "" && !event.NotIgnoreIfNoContact {
				continue
			}
		}

		// 生成通知内容
		title, content, templateID, err := m.contentGen.GenerateContent(event, method)
		if err != nil {
			errors = append(
				errors,
				fmt.Sprintf("failed to generate content for %s: %v", method, err),
			)
			continue
		}

		// 创建通知消息
		message := &NotificationMessage{
			UserUID:    event.UserUID,
			EventType:  event.EventType,
			Method:     method,
			Priority:   event.Priority,
			Title:      title,
			Content:    content,
			Recipient:  event.Recipient,
			EventData:  event.EventData,
			TemplateID: templateID,
			Timestamp:  event.Timestamp,
		}

		// 发送通知
		result, err := provider.Send(ctx, message)
		if err != nil {
			// 创建失败结果
			result = &NotificationResult{
				UserUID:   event.UserUID,
				EventType: event.EventType,
				Method:    method,
				Success:   false,
				Error:     err.Error(),
				SentAt:    time.Now(),
			}
			errors = append(errors, fmt.Sprintf("failed to send %s notification: %v", method, err))
		}

		results = append(results, result)
	}

	var finalError error
	if len(errors) > 0 {
		finalError = fmt.Errorf("notification sending errors: %s", strings.Join(errors, "; "))
	}

	return results, finalError
}

// SetContactProvider 设置用户联系方式提供者
func (m *ProviderManager) SetContactProvider(provider UserContactProvider) {
	m.contactProvider = provider
}

// SetContentGenerator 设置内容生成器
func (m *ProviderManager) SetContentGenerator(generator NotificationContentGenerator) {
	m.contentGen = generator
}
