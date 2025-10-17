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
	"strings"
	"text/template"
	"time"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
)

// NotificationMethod 通知方式枚举
type NotificationMethod string

const (
	NotificationMethodVMS   NotificationMethod = "vms"
	NotificationMethodEmail NotificationMethod = "email"
	NotificationMethodSMS   NotificationMethod = "sms"
)

// NotificationPriority 通知优先级枚举
type NotificationPriority string

const (
	NotificationPriorityLow      NotificationPriority = "low"
	NotificationPriorityNormal   NotificationPriority = "normal"
	NotificationPriorityHigh     NotificationPriority = "high"
	NotificationPriorityCritical NotificationPriority = "critical"
)

// EventType 事件类型，基于现有的业务状态
type EventType string

const (
	// 债务相关事件
	EventTypeDebtStatusChange EventType = "debt_status_change"

	// 订阅相关事件
	EventTypeSubscriptionStatusChange  EventType = "subscription_status_change"
	EventTypeSubscriptionRenewalFailed EventType = "subscription_renewal_failed"

	EventTypeSubscriptionOperationDone EventType = "subscription_operation_done"
	EventTypeSubscriptionPaymentDone   EventType = "subscription_payment_done"

	EventTypeUniversalWorkspaceSubscriptionEvent EventType = "universal_workspace_subscription_event"

	EventTypeWorkspaceSubscriptionCreatedSuccess         EventType = "workspace_subscription_created_success"
	EventTypeWorkspaceSubscriptionCreatedFailed          EventType = "workspace_subscription_created_failed"
	EventTypeWorkspaceSubscriptionUpgradedSuccess        EventType = "workspace_subscription_upgraded_success"
	EventTypeWorkspaceSubscriptionUpgradedFailed         EventType = "workspace_subscription_upgraded_failed"
	EventTypeWorkspaceSubscriptionDowngradedSuccess      EventType = "workspace_subscription_downgraded_success"
	EventTypeWorkspaceSubscriptionDowngradedFailed       EventType = "workspace_subscription_downgraded_failed"
	EventTypeWorkspaceSubscriptionRenewedSuccess         EventType = "workspace_subscription_renewed_success"
	EventTypeWorkspaceSubscriptionRenewedBalanceFallback EventType = "workspace_subscription_renewed_balance_fallback"
	EventTypeWorkspaceSubscriptionRenewedFailed          EventType = "workspace_subscription_renewed_failed"
	EventTypeWorkspaceSubscriptionExpired                EventType = "workspace_subscription_expired"
	EventTypeWorkspaceSubscriptionExpiredDeleteResources EventType = "workspace_subscription_expired_delete_resources"

	// 流量相关事件
	EventTypeTrafficStatusChange EventType = "traffic_status_change"
	EventTypeTrafficUsageAlert   EventType = "traffic_usage_alert"

	// 债务预警事件
	// 债务到期
	EventTypeWorkspaceSubscriptionDebt EventType = "workspace_subscription_debt"
	// 债务删除预警
	EventTypeWorkspaceSubscriptionDebtPreDeletion EventType = "workspace_subscription_debt_pre_deletion"
	// 债务最终删除预警
	EventTypeWorkspaceSubscriptionDebtFinalDeletion EventType = "workspace_subscription_debt_final_deletion"

	// 自定义事件
	EventTypeCustom EventType = "custom"
)

// NotificationEvent 通知事件结构（输入）
type NotificationEvent struct {
	UserUID   uuid.UUID                   `json:"user_uid"`
	EventType EventType                   `json:"event_type"`
	EventData map[string]any              `json:"event_data"`
	Recipient types.NotificationRecipient `json:"recipient,omitempty"`
	Methods   []NotificationMethod        `json:"methods"`
	Priority  NotificationPriority        `json:"priority,omitempty"`
	Timestamp time.Time                   `json:"timestamp"`
	// Whether to ignore users without contact information, the default is false to ignore
	NotIgnoreIfNoContact bool `json:"ignore_if_no_contact,omitempty"`
}

type EventData interface {
	ToMap() map[string]any
}

func (t *WorkspaceSubscriptionTrafficEventData) ToMap() map[string]any {
	return map[string]any{
		"type":            t.Type,
		"status":          t.Status,
		"used_percentage": t.UsagePercent,
		"total_bytes":     t.TotalBytes,
		"used_bytes":      t.UsedBytes,
		"workspace_name":  t.Workspace,
		"region_domain":   t.RegionDomain,
		"plan_name":       t.PlanName,
		"features":        t.Features,
		"expiration_date": t.ExpirationDate,
	}
}

func (t *WorkspaceSubscriptionTrafficEventData) GetType() EventType {
	return t.Type
}

func (t *DebtEventData) ToMap() map[string]any {
	return map[string]any{
		"type":           t.Type,
		"last_status":    t.LastStatus,
		"current_status": t.CurrentStatus,
		"debt_days":      t.DebtDays,
	}
}

func (t *DebtEventData) GetType() EventType {
	return t.Type
}

func (t *WorkspaceSubscriptionDebtEventData) ToMap() map[string]any {
	return map[string]any{
		"type":            t.Type,
		"last_status":     t.LastStatus,
		"current_status":  t.CurrentStatus,
		"debt_days":       t.DebtDays,
		"region_domain":   t.RegionDomain,
		"workspace_name":  t.WorkspaceName,
		"expiration_date": t.ExpirationDate,
		"plan_name":       t.PlanName,
	}
}

func (t *WorkspaceSubscriptionEventData) GetType() EventType {
	return t.Type
}

func (t *CustomEventData) GetType() EventType {
	return t.Type
}

func (t *WorkspaceSubscriptionEventData) ToMap() map[string]any {
	return map[string]any{
		"type":            t.Type,
		"region_domain":   t.RegionDomain,
		"expiration_date": t.ExpirationDate,
		"workspace_name":  t.WorkspaceName,
		"domain":          t.Domain,
		"operator":        t.Operator,
		"status":          t.Status,
		"pay_status":      t.PayStatus,
		"pay_method":      t.PayMethod,
		"days_remaining":  t.DaysRemaining,
		"old_plan_name":   t.OldPlanName,
		"new_plan_name":   t.NewPlanName,
		"amount":          t.Amount,
		"error_reason":    t.ErrorReason,
		"next_pay_date":   t.NextPayDate,
		"features":        t.Features,
	}
}

func (t *CustomEventData) ToMap() map[string]any {
	return map[string]any{
		"type":       t.Type,
		"title":      t.Title,
		"content":    t.Content,
		"extra_data": t.ExtraData,
	}
}

// NotificationMessage 通知消息结构（内部处理）
type NotificationMessage struct {
	UserUID    uuid.UUID                   `json:"user_uid"`
	EventType  EventType                   `json:"event_type"`
	Method     NotificationMethod          `json:"method"`
	Priority   NotificationPriority        `json:"priority"`
	Title      string                      `json:"title"`
	Content    string                      `json:"content"`
	Recipient  types.NotificationRecipient `json:"recipient"`
	EventData  map[string]any              `json:"event_data"`
	TemplateID string                      `json:"template_id,omitempty"`
	Timestamp  time.Time                   `json:"timestamp"`
}

// NotificationResult 通知发送结果
type NotificationResult struct {
	UserUID          uuid.UUID          `json:"user_uid"`
	EventType        EventType          `json:"event_type"`
	Method           NotificationMethod `json:"method"`
	Success          bool               `json:"success"`
	Error            string             `json:"error,omitempty"`
	ProviderResponse string             `json:"provider_response,omitempty"`
	SentAt           time.Time          `json:"sent_at"`
}

// NotificationProvider 通知提供者接口（简化版）
type NotificationProvider interface {
	Send(ctx context.Context, message *NotificationMessage) (*NotificationResult, error)
	GetName() string
	IsAvailable() bool
	GetSupportedMethods() []NotificationMethod
}

// UserContactProvider 用户联系方式提供者接口
type UserContactProvider interface {
	GetUserContact(ctx context.Context, userUID uuid.UUID) (*types.NotificationRecipient, error)
	SetUserContact(userUID uuid.UUID, recipient *types.NotificationRecipient)
	RemoveUserContact(userUID uuid.UUID)
}

// NotificationContentGenerator 通知内容生成器接口
type NotificationContentGenerator interface {
	GenerateContent(
		event *NotificationEvent,
		method NotificationMethod,
	) (title, content, templateID string, err error)
}

// ProviderConfig 通知提供者配置
type ProviderConfig struct {
	// VMS配置
	VMSAPIKey          string               `json:"vms_api_key"`
	VMSAPISecret       string               `json:"vms_api_secret"`
	VMSEndpoint        string               `json:"vms_endpoint"`
	VMSTemplates       map[EventType]string `json:"vms_templates"` // 按事件类型配置模板ID
	VMSNumberPool      string               `json:"vms_number_pool"`
	VMSDefaultTemplate string               `json:"vms_default_template"` // 默认模板ID

	// Email配置
	SMTPHost             string               `json:"smtp_host"`
	SMTPPort             int                  `json:"smtp_port"`
	SMTPUsername         string               `json:"smtp_username"`
	SMTPPassword         string               `json:"smtp_password"`
	FromEmail            string               `json:"from_email"`
	FromName             string               `json:"from_name"`
	EmailTemplates       map[EventType]string `json:"email_templates"`        // 按事件类型配置邮件模板
	EmailDefaultTemplate string               `json:"email_default_template"` // 默认邮件模板

	// SMS配置
	SMSAccessKeyID     string               `json:"sms_access_key_id"`
	SMSAccessKeySecret string               `json:"sms_access_key_secret"`
	SMSEndpoint        string               `json:"sms_endpoint"`
	SMSSignName        string               `json:"sms_sign_name"`
	SMSTemplates       map[EventType]string `json:"sms_templates"`        // 按事件类型配置短信模板
	SMSDefaultTemplate string               `json:"sms_default_template"` // 默认短信模板

	// 通用配置
	IsEnabled   bool           `json:"is_enabled"`
	MaxRetries  int            `json:"max_retries"`
	RetryDelay  time.Duration  `json:"retry_delay"`
	Timeout     time.Duration  `json:"timeout"`
	ExtraConfig map[string]any `json:"extra_config,omitempty"`
}

func ParseConfigsWithJSON(cfgStr string) (map[NotificationMethod]ProviderConfig, error) {
	var configs map[NotificationMethod]ProviderConfig
	err := json.Unmarshal([]byte(cfgStr), &configs)
	if err != nil {
		return nil, fmt.Errorf("failed to parse config json: %w", err)
	}
	return configs, nil
}

// GetVMSTemplateID 根据事件类型获取对应的模板ID
func (c *ProviderConfig) GetVMSTemplateID(eventType EventType) string {
	if c.VMSTemplates != nil {
		if templateID, exists := c.VMSTemplates[eventType]; exists && templateID != "" {
			return templateID
		}
	}
	return c.VMSDefaultTemplate
}

// GetSMSTemplateCode 根据事件类型获取对应的短信模板代码
func (c *ProviderConfig) GetSMSTemplateCode(eventType EventType) string {
	if c.SMSTemplates != nil {
		if templateCode, exists := c.SMSTemplates[eventType]; exists && templateCode != "" {
			return templateCode
		}
	}
	return c.SMSDefaultTemplate
}

func (c *ProviderConfig) GenerateEmailContent(event *NotificationEvent) (string, error) {
	emailData, err := generateEmailContent(event)
	if err != nil {
		return "", err
	}
	if emailData.PlanDetails != nil {
		fmt.Printf("emailData: %+v\n", emailData.PlanDetails.Features)
	}
	// 构建HTML内容
	tmpl, err := template.New("email").
		Parse(c.GetEmailTemplate(EventTypeUniversalWorkspaceSubscriptionEvent))
	if err != nil {
		return "", fmt.Errorf("failed to parse email template: %w", err)
	}
	var renderedContent strings.Builder
	if err := tmpl.Execute(&renderedContent, emailData); err != nil {
		return "", fmt.Errorf("failed to render email template: %w", err)
	}
	return renderedContent.String(), nil
}

// GetEmailTemplate 根据事件类型获取对应的邮件模板
func (c *ProviderConfig) GetEmailTemplate(eventType EventType) string {
	if c.EmailTemplates != nil {
		if template, exists := c.EmailTemplates[eventType]; exists && template != "" {
			return template
		}
	}
	return WorkspaceSubscriptionEventEmailRenderTmpl
}

// DebtEventData 债务事件数据
type DebtEventData struct {
	Type          EventType            `json:"-"`
	LastStatus    types.DebtStatusType `json:"last_status"`
	CurrentStatus types.DebtStatusType `json:"current_status"`
	DebtDays      int                  `json:"debt_days,omitempty"`
}

type WorkspaceSubscriptionDebtEventData struct {
	Type           EventType                `json:"-"`
	RegionDomain   string                   `json:"region_domain"`
	WorkspaceName  string                   `json:"workspace_name"`
	PlanName       string                   `json:"plan_name"`
	ExpirationDate string                   `json:"expiration_date"`
	LastStatus     types.SubscriptionStatus `json:"last_status"`
	CurrentStatus  types.SubscriptionStatus `json:"current_status"`
	DebtDays       int                      `json:"debt_days,omitempty"`
}

// WorkspaceSubscriptionEventData 订阅事件数据
type WorkspaceSubscriptionEventData struct {
	Type           EventType                   `json:"type"`
	RegionDomain   string                      `json:"region_domain"`
	ExpirationDate string                      `json:"expiration_date"`
	WorkspaceName  string                      `json:"workspace_name"`
	Domain         string                      `json:"domain,omitempty"`
	Operator       types.SubscriptionOperator  `json:"operator,omitempty"`
	Status         types.SubscriptionStatus    `json:"status,omitempty"`
	PayStatus      types.SubscriptionPayStatus `json:"pay_status,omitempty"`
	PayMethod      types.PaymentMethod         `json:"pay_method,omitempty"`
	Features       []string                    `json:"features,omitempty"`
	DaysRemaining  int                         `json:"days_remaining,omitempty"`
	OldPlanName    string                      `json:"old_plan_name,omitempty"`
	NewPlanName    string                      `json:"new_plan_name,omitempty"`
	Amount         float64                     `json:"amount,omitempty"`
	NextPayDate    string                      `json:"next_pay_date,omitempty"`
	ErrorReason    string                      `json:"error_reason,omitempty"`
}

// WorkspaceSubscriptionTrafficEventData 流量事件数据
type WorkspaceSubscriptionTrafficEventData struct {
	RegionDomain   string                       `json:"region_domain"`
	PlanName       string                       `json:"plan_name,omitempty"`
	Type           EventType                    `json:"-"`
	Status         types.WorkspaceTrafficStatus `json:"status,omitempty"`
	ExpirationDate string                       `json:"expiration_date"`
	UsagePercent   int                          `json:"used_percentage,omitempty"`
	TotalBytes     int64                        `json:"total_bytes,omitempty"`
	UsedBytes      int64                        `json:"used_bytes,omitempty"`
	Workspace      string                       `json:"workspace_name,omitempty"`
	Features       []string                     `json:"features,omitempty"`
}

// CustomEventData 自定义事件数据
type CustomEventData struct {
	Type      EventType      `json:"-"`
	Title     string         `json:"title"`
	Content   string         `json:"content"`
	ExtraData map[string]any `json:"extra_data,omitempty"`
}
