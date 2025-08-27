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
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/labring/sealos/controllers/pkg/types"

	openapi "github.com/alibabacloud-go/darabonba-openapi/v2/client"
	dysmsapi20170525 "github.com/alibabacloud-go/dysmsapi-20170525/v3/client"
	util "github.com/alibabacloud-go/tea-utils/v2/service"
	"github.com/alibabacloud-go/tea/tea"
	"github.com/go-gomail/gomail"
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

func (p *VMSProvider) Send(ctx context.Context, message *NotificationMessage) (*NotificationResult, error) {
	if !p.IsAvailable() {
		return nil, fmt.Errorf("VMS provider is not available")
	}

	if message.Recipient.PhoneNumber == "" {
		return nil, fmt.Errorf("phone number is required for VMS notification")
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
	phoneParam := make(map[string]interface{})
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
		SingleOpenId: message.Recipient.PhoneNumber + "-" + result.SentAt.Format("2006-01-02"),
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
	responseData := map[string]interface{}{
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
	log.Printf("VMS notification sent successfully to %s, status: %d", message.Recipient.PhoneNumber, statusCode)
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
	if config.SMTPHost == "" || config.SMTPUsername == "" || config.SMTPPassword == "" || config.FromEmail == "" {
		log.Printf("Email provider configuration incomplete, disabling provider")
		return provider
	}

	provider.Available = true
	log.Printf("Email provider initialized successfully")
	return provider
}

func (p *EmailProvider) Send(ctx context.Context, message *NotificationMessage) (*NotificationResult, error) {
	if !p.IsAvailable() {
		return nil, fmt.Errorf("Email provider is not available")
	}

	if message.Recipient.Email == "" {
		return nil, fmt.Errorf("email address is required for email notification")
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
		emailContent = p.renderEmailTemplate(message.TemplateID, message.Content, message.EventData, message.Recipient)
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
	d := gomail.NewDialer(p.Config.SMTPHost, p.Config.SMTPPort, p.Config.SMTPUsername, p.Config.SMTPPassword)

	// 发送邮件
	if err := d.DialAndSend(m); err != nil {
		result.Success = false
		result.Error = fmt.Sprintf("failed to send email: %v", err)
		return result, err
	}

	// 构建响应数据
	responseData := map[string]interface{}{
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
func (p *EmailProvider) renderEmailTemplate(templateContent, content string, eventData map[string]interface{}, recipient types.NotificationRecipient) string {
	renderedTemplate := templateContent

	// 基本变量替换
	renderedTemplate = strings.ReplaceAll(renderedTemplate, "{{.content}}", content)
	renderedTemplate = strings.ReplaceAll(renderedTemplate, "{{.UserName}}", recipient.UserName)

	// 替换事件数据中的变量
	if eventData != nil {
		if workspaceName, ok := eventData["workspace_name"]; ok {
			renderedTemplate = strings.ReplaceAll(renderedTemplate, "{{.workspace_name}}", fmt.Sprintf("%v", workspaceName))
		}
		if usedPercentage, ok := eventData["used_percentage"]; ok {
			renderedTemplate = strings.ReplaceAll(renderedTemplate, "{{.used_percentage}}", fmt.Sprintf("%v", usedPercentage))
		}
		if planName, ok := eventData["plan_name"]; ok {
			renderedTemplate = strings.ReplaceAll(renderedTemplate, "{{.plan_name}}", fmt.Sprintf("%v", planName))
		}
		if errorReason, ok := eventData["error_reason"]; ok {
			renderedTemplate = strings.ReplaceAll(renderedTemplate, "{{.error_reason}}", fmt.Sprintf("%v", errorReason))
		}
		if amount, ok := eventData["amount"]; ok {
			renderedTemplate = strings.ReplaceAll(renderedTemplate, "{{.amount}}", fmt.Sprintf("%v", amount))
		}
		if expireDays, ok := eventData["expire_days"]; ok {
			renderedTemplate = strings.ReplaceAll(renderedTemplate, "{{.expire_days}}", fmt.Sprintf("%v", expireDays))
		}

		// 处理其他动态变量
		for key, value := range eventData {
			placeholder := fmt.Sprintf("{{.%s}}", key)
			renderedTemplate = strings.ReplaceAll(renderedTemplate, placeholder, fmt.Sprintf("%v", value))
		}
	}

	return renderedTemplate
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
	if config.SMSAccessKeyID == "" || config.SMSAccessKeySecret == "" || config.SMSDefaultTemplate == "" {
		log.Printf("SMS provider configuration incomplete, disabling provider")
		return provider
	}

	provider.Available = true
	log.Printf("SMS provider initialized successfully")
	return provider
}

func (p *SMSProvider) Send(ctx context.Context, message *NotificationMessage) (*NotificationResult, error) {
	if !p.IsAvailable() {
		return nil, fmt.Errorf("SMS provider is not available")
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
	responseData := map[string]interface{}{
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
	log.Printf("SMS notification sent successfully to %s, RequestId: %s", message.Recipient.PhoneNumber, *resp.Body.RequestId)
	return result, nil
}

// ProviderManager 通知提供者管理器
type ProviderManager struct {
	providers       map[NotificationMethod]NotificationProvider
	contactProvider UserContactProvider
	contentGen      NotificationContentGenerator
}

// NewProviderManager 创建提供者管理器
func NewProviderManager(configs map[NotificationMethod]ProviderConfig, contactProvider UserContactProvider) *ProviderManager {
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
func (m *ProviderManager) SendEvent(ctx context.Context, event *NotificationEvent) ([]*NotificationResult, error) {
	var results []*NotificationResult
	var errors []string

	// 如果事件中没有接收者信息，尝试获取
	recipient := event.Recipient
	if recipient.UserName == "" || (recipient.Email == "" && recipient.PhoneNumber == "") {
		if m.contactProvider != nil {
			contact, err := m.contactProvider.GetUserContact(ctx, event.UserUID)
			if err != nil {
				log.Printf("Failed to get user contact info for user %s: %v", event.UserUID, err)
			} else if contact != nil {
				// 补充接收者信息
				if recipient.UserName == "" {
					recipient.UserName = contact.UserName
				}
				if recipient.Email == "" {
					recipient.Email = contact.Email
				}
				if recipient.PhoneNumber == "" {
					recipient.PhoneNumber = contact.PhoneNumber
				}
				if recipient.UserID == "" {
					recipient.UserID = contact.UserID
				}
			}
		}
	}

	// 为每种通知方式生成消息并发送
	for _, method := range event.Methods {
		provider, exists := m.GetProvider(method)
		if !exists {
			continue
		}

		if !provider.IsAvailable() {
			errors = append(errors, fmt.Sprintf("provider %s is not available", provider.GetName()))
			continue
		}
		switch provider.GetName() {
		case "email":
			if recipient.Email == "" && !event.NotIgnoreIfNoContact {
				continue
			}
		case "sms", "vms":
			if recipient.PhoneNumber == "" && !event.NotIgnoreIfNoContact {
				continue
			}
		}

		// 生成通知内容
		title, content, templateID, err := m.contentGen.GenerateContent(event.EventType, method, event.EventData, recipient)
		if err != nil {
			errors = append(errors, fmt.Sprintf("failed to generate content for %s: %v", method, err))
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
			Recipient:  recipient,
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
