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
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
)

// EventNotificationService 事件驱动的通知服务
type EventNotificationService interface {
	// 发送事件通知
	SendEventNotification(
		ctx context.Context,
		event *NotificationEvent,
	) ([]*NotificationResult, error)

	// 债务状态变更事件
	HandleDebtStatusChange(
		ctx context.Context,
		userUID uuid.UUID,
		lastStatus, currentStatus types.DebtStatusType,
		debtDays int,
		methods []NotificationMethod,
	) ([]*NotificationResult, error)

	// 订阅相关事件
	HandleWorkspaceSubscriptionEvent(
		ctx context.Context,
		userUID uuid.UUID,
		eventData EventData,
		operator types.SubscriptionOperator,
		methods []NotificationMethod,
	) ([]*NotificationResult, error)

	// 流量相关事件
	HandleTrafficEvent(
		ctx context.Context,
		userUID uuid.UUID,
		status types.WorkspaceTrafficStatus,
		usagePercent int,
		workspace string,
		methods []NotificationMethod,
	) ([]*NotificationResult, error)

	// 自定义事件
	HandleCustomEvent(
		ctx context.Context,
		userUID uuid.UUID,
		title, content string,
		extraData map[string]any,
		methods []NotificationMethod,
	) ([]*NotificationResult, error)
}

// eventNotificationServiceImpl 事件通知服务实现
type eventNotificationServiceImpl struct {
	providerManager *ProviderManager
}

// NewEventNotificationService 创建事件通知服务
func NewEventNotificationService(
	configs map[NotificationMethod]ProviderConfig,
	contactProvider UserContactProvider,
) EventNotificationService {
	providerManager := NewProviderManager(configs, contactProvider)

	return &eventNotificationServiceImpl{
		providerManager: providerManager,
	}
}

// SendEventNotification 发送事件通知
func (s *eventNotificationServiceImpl) SendEventNotification(
	ctx context.Context,
	event *NotificationEvent,
) ([]*NotificationResult, error) {
	// 设置默认值
	if event.Priority == "" {
		event.Priority = NotificationPriorityNormal
	}
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
	}

	// 发送通知
	results, err := s.providerManager.SendEvent(ctx, event)

	// 记录发送日志
	for _, result := range results {
		if result.Success {
			log.Printf("Event notification sent successfully: UserUID=%s, EventType=%s, Method=%s",
				result.UserUID, result.EventType, result.Method)
		} else {
			log.Printf("Event notification failed: UserUID=%s, EventType=%s, Method=%s, Error=%s",
				result.UserUID, result.EventType, result.Method, result.Error)
		}
	}

	return results, err
}

// HandleDebtStatusChange 处理债务状态变更事件
func (s *eventNotificationServiceImpl) HandleDebtStatusChange(
	ctx context.Context,
	userUID uuid.UUID,
	lastStatus, currentStatus types.DebtStatusType,
	debtDays int,
	methods []NotificationMethod,
) ([]*NotificationResult, error) {
	// 只在状态真正发生变化时发送通知
	if lastStatus == currentStatus {
		return nil, nil
	}

	// 构建事件数据
	eventData := map[string]any{
		"last_status":    string(lastStatus),
		"current_status": string(currentStatus),
		"debt_days":      debtDays,
	}

	// 根据债务状态设置优先级
	var priority NotificationPriority
	switch currentStatus {
	case types.FinalDeletionPeriod:
		priority = NotificationPriorityCritical
	case types.DebtDeletionPeriod:
		priority = NotificationPriorityHigh
	case types.DebtPeriod:
		priority = NotificationPriorityHigh
	default:
		priority = NotificationPriorityNormal
	}

	event := &NotificationEvent{
		UserUID:   userUID,
		EventType: EventTypeDebtStatusChange,
		EventData: eventData,
		Methods:   methods,
		Priority:  priority,
		Timestamp: time.Now(),
	}

	return s.SendEventNotification(ctx, event)
}

// HandleSubscriptionEvent 处理订阅相关事件
func (s *eventNotificationServiceImpl) HandleWorkspaceSubscriptionEvent(
	ctx context.Context,
	userUID uuid.UUID,
	eventData EventData,
	operator types.SubscriptionOperator,
	methods []NotificationMethod,
) ([]*NotificationResult, error) {
	// 构建事件数据
	// eventData := map[string]interface{}{
	//	"workspace_name": workspace,
	//	"operator":       string(operator),
	//	"old_plan_name":  oldPlan,
	//	"new_plan_name":  newPlan,
	//	"pay_status":     string(payStatus),
	//}
	//
	// if errorReason != "" {
	//	eventData["error_reason"] = errorReason
	//}
	eventDataMap := eventData.ToMap()
	payStatus := eventDataMap["pay_status"]
	// payMethod := eventDataMap["pay_method"]
	// 根据操作类型设置优先级
	var priority NotificationPriority
	if payStatus == types.SubscriptionPayStatusFailed ||
		operator == types.SubscriptionTransactionTypeCanceled {
		priority = NotificationPriorityHigh
	} else {
		priority = NotificationPriorityNormal
	}
	var eventType EventType
	if eventDataMap["type"] != nil {
		if et, ok := eventDataMap["type"].(EventType); ok {
			eventType = et
		}
	}
	if eventType == "" {
		switch operator {
		case types.SubscriptionTransactionTypeCreated:
			if payStatus == types.SubscriptionPayStatusPaid {
				eventType = EventTypeWorkspaceSubscriptionCreatedSuccess
			} else {
				eventType = EventTypeWorkspaceSubscriptionCreatedFailed
			}
		case types.SubscriptionTransactionTypeUpgraded:
			if payStatus == types.SubscriptionPayStatusPaid {
				eventType = EventTypeWorkspaceSubscriptionUpgradedSuccess
			} else {
				eventType = EventTypeWorkspaceSubscriptionUpgradedFailed
			}
		case types.SubscriptionTransactionTypeDowngraded:
		case types.SubscriptionTransactionTypeRenewed:
			switch payStatus {
			case types.SubscriptionPayStatusPaid:
				eventType = EventTypeWorkspaceSubscriptionRenewedSuccess
			case types.SubscriptionPayStatusFailedAndUseBalance:
				eventType = EventTypeWorkspaceSubscriptionRenewedBalanceFallback
			default:
				eventType = EventTypeWorkspaceSubscriptionRenewedFailed
			}
		}
	}

	event := &NotificationEvent{
		UserUID:   userUID,
		EventType: eventType,
		EventData: eventData.ToMap(),
		Methods:   methods,
		Priority:  priority,
		Timestamp: time.Now(),
	}

	return s.SendEventNotification(ctx, event)
}

// HandleTrafficEvent 处理流量相关事件
func (s *eventNotificationServiceImpl) HandleTrafficEvent(
	ctx context.Context,
	userUID uuid.UUID,
	status types.WorkspaceTrafficStatus,
	usagePercent int,
	workspace string,
	methods []NotificationMethod,
) ([]*NotificationResult, error) {
	// 构建事件数据
	eventData := map[string]any{
		"status":        string(status),
		"usage_percent": usagePercent,
		"workspace":     workspace,
	}

	// 根据流量状态设置优先级
	var priority NotificationPriority
	switch status {
	case types.WorkspaceTrafficStatusExhausted, types.WorkspaceTrafficStatusUsedUp:
		priority = NotificationPriorityHigh
	default:
		switch {
		case usagePercent >= 90:
			priority = NotificationPriorityHigh
		case usagePercent >= 80:
			priority = NotificationPriorityNormal
		default:
			return nil, nil // 低于80%不发送通知
		}
	}

	event := &NotificationEvent{
		UserUID:   userUID,
		EventType: EventTypeTrafficStatusChange,
		EventData: eventData,
		Methods:   methods,
		Priority:  priority,
		Timestamp: time.Now(),
	}

	return s.SendEventNotification(ctx, event)
}

// HandleCustomEvent 处理自定义事件
func (s *eventNotificationServiceImpl) HandleCustomEvent(
	ctx context.Context,
	userUID uuid.UUID,
	title, content string,
	extraData map[string]any,
	methods []NotificationMethod,
) ([]*NotificationResult, error) {
	// 构建事件数据
	eventData := map[string]any{
		"title":   title,
		"content": content,
	}

	if extraData != nil {
		eventData["extra_data"] = extraData
	}

	event := &NotificationEvent{
		UserUID:   userUID,
		EventType: EventTypeCustom,
		EventData: eventData,
		Methods:   methods,
		Priority:  NotificationPriorityNormal,
		Timestamp: time.Now(),
	}

	return s.SendEventNotification(ctx, event)
}

// NotificationHelper 通知助手，提供便捷的事件发送方法
type NotificationHelper struct {
	service EventNotificationService
}

// NewNotificationHelper 创建通知助手
func NewNotificationHelper(service EventNotificationService) *NotificationHelper {
	return &NotificationHelper{
		service: service,
	}
}

// SendDebtNotification 发送欠费通知
func (h *NotificationHelper) SendDebtNotification(
	ctx context.Context,
	userUID uuid.UUID,
	methods []NotificationMethod,
) error {
	_, err := h.service.HandleDebtStatusChange(
		ctx,
		userUID,
		types.NormalPeriod,
		types.DebtPeriod,
		0,
		methods,
	)
	return err
}

// SendDebt3DaysNotification 发送欠费3天通知
func (h *NotificationHelper) SendDebt3DaysNotification(
	ctx context.Context,
	userUID uuid.UUID,
	methods []NotificationMethod,
) error {
	_, err := h.service.HandleDebtStatusChange(
		ctx,
		userUID,
		types.DebtPeriod,
		types.DebtDeletionPeriod,
		3,
		methods,
	)
	return err
}

// SendDebt7DaysPreCleanupNotification 发送欠费7天预清理通知
func (h *NotificationHelper) SendDebt7DaysPreCleanupNotification(
	ctx context.Context,
	userUID uuid.UUID,
	methods []NotificationMethod,
) error {
	_, err := h.service.HandleDebtStatusChange(
		ctx,
		userUID,
		types.DebtDeletionPeriod,
		types.FinalDeletionPeriod,
		7,
		methods,
	)
	return err
}

// SendTrafficLow80Notification 发送流量不足80%通知
func (h *NotificationHelper) SendTrafficLow80Notification(
	ctx context.Context,
	userUID uuid.UUID,
	usagePercent int,
	methods []NotificationMethod,
) error {
	_, err := h.service.HandleTrafficEvent(
		ctx,
		userUID,
		types.WorkspaceTrafficStatusActive,
		usagePercent,
		"default",
		methods,
	)
	return err
}

// SendTrafficExhaustedNotification 发送流量已用尽通知
func (h *NotificationHelper) SendTrafficExhaustedNotification(
	ctx context.Context,
	userUID uuid.UUID,
	methods []NotificationMethod,
) error {
	_, err := h.service.HandleTrafficEvent(
		ctx,
		userUID,
		types.WorkspaceTrafficStatusExhausted,
		100,
		"default",
		methods,
	)
	return err
}

// SendWorkspaceSubscriptionCreateSuccessNotification 发送创建订阅成功通知
func (h *NotificationHelper) SendWorkspaceSubscriptionCreateSuccessNotification(
	ctx context.Context,
	userUID uuid.UUID,
	eventData EventData,
	methods []NotificationMethod,
) error {
	_, err := h.service.HandleWorkspaceSubscriptionEvent(
		ctx,
		userUID,
		eventData,
		types.SubscriptionTransactionTypeCreated,
		methods,
	)
	return err
}

// SendWorkspaceSubscriptionCreateFailedNotification 发送创建订阅失败通知
func (h *NotificationHelper) SendWorkspaceSubscriptionCreateFailedNotification(
	ctx context.Context,
	userUID uuid.UUID,
	eventData EventData,
	methods []NotificationMethod,
) error {
	_, err := h.service.HandleWorkspaceSubscriptionEvent(
		ctx,
		userUID,
		eventData,
		types.SubscriptionTransactionTypeCreated,
		methods,
	)
	return err
}

// SendWorkspaceSubscriptionRenewSuccessNotification 发送续订成功通知
func (h *NotificationHelper) SendWorkspaceSubscriptionRenewSuccessNotification(
	ctx context.Context,
	userUID uuid.UUID,
	eventData EventData,
	methods []NotificationMethod,
) error {
	_, err := h.service.HandleWorkspaceSubscriptionEvent(
		ctx,
		userUID,
		eventData,
		types.SubscriptionTransactionTypeRenewed,
		methods,
	)
	return err
}

// SendWorkspaceSubscriptionUpgradeSuccessNotification 发送升级成功通知
func (h *NotificationHelper) SendWorkspaceSubscriptionUpgradeSuccessNotification(
	ctx context.Context,
	userUID uuid.UUID,
	eventData EventData,
	methods []NotificationMethod,
) error {
	_, err := h.service.HandleWorkspaceSubscriptionEvent(
		ctx,
		userUID,
		eventData,
		types.SubscriptionTransactionTypeUpgraded,
		methods,
	)
	return err
}

// SendWorkspaceSubscriptionUpgradeFailedNotification 发送升级失败通知
func (h *NotificationHelper) SendWorkspaceSubscriptionUpgradeFailedNotification(
	ctx context.Context,
	userUID uuid.UUID,
	eventData EventData,
	methods []NotificationMethod,
) error {
	_, err := h.service.HandleWorkspaceSubscriptionEvent(
		ctx,
		userUID,
		eventData,
		types.SubscriptionTransactionTypeUpgraded,
		methods,
	)
	return err
}

// SendWorkspaceSubscriptionDowngradeSuccessNotification 发送降级成功通知
func (h *NotificationHelper) SendWorkspaceSubscriptionDowngradeSuccessNotification(
	ctx context.Context,
	userUID uuid.UUID,
	eventData EventData,
	methods []NotificationMethod,
) error {
	_, err := h.service.HandleWorkspaceSubscriptionEvent(
		ctx,
		userUID,
		eventData,
		types.SubscriptionTransactionTypeDowngraded,
		methods,
	)
	return err
}

// SendWorkspaceSubscriptionRenewFailedNotification 发送续订失败通知
func (h *NotificationHelper) SendWorkspaceSubscriptionRenewFailedNotification(
	ctx context.Context,
	userUID uuid.UUID,
	eventData EventData,
	methods []NotificationMethod,
) error {
	_, err := h.service.HandleWorkspaceSubscriptionEvent(
		ctx,
		userUID,
		eventData,
		types.SubscriptionTransactionTypeRenewed,
		methods,
	)
	return err
}

// SendDatabaseResourceLowNotification 发送数据库资源不足通知
func (h *NotificationHelper) SendDatabaseResourceLowNotification(
	ctx context.Context,
	userUID uuid.UUID,
	databaseName string,
	usagePercent int,
	methods []NotificationMethod,
) error {
	extraData := map[string]any{
		"database_name": databaseName,
		"usage_percent": usagePercent,
	}
	title := "数据库资源预警"
	content := fmt.Sprintf("您的数据库%s资源使用量已达到%d%%，请注意优化。", databaseName, usagePercent)

	_, err := h.service.HandleCustomEvent(ctx, userUID, title, content, extraData, methods)
	return err
}

// SendDatabaseAbnormalNotification 发送数据库异常通知
func (h *NotificationHelper) SendDatabaseAbnormalNotification(
	ctx context.Context,
	userUID uuid.UUID,
	databaseName, errorReason string,
	methods []NotificationMethod,
) error {
	extraData := map[string]any{
		"database_name": databaseName,
		"error_reason":  errorReason,
	}
	title := "数据库异常通知"
	content := fmt.Sprintf("您的数据库%s出现异常：%s", databaseName, errorReason)

	_, err := h.service.HandleCustomEvent(ctx, userUID, title, content, extraData, methods)
	return err
}

// SendCustomNotification 发送自定义通知
func (h *NotificationHelper) SendCustomNotification(
	ctx context.Context,
	userUID uuid.UUID,
	title, content string,
	methods []NotificationMethod,
	priority NotificationPriority,
	extraData map[string]any,
) error {
	_, err := h.service.HandleCustomEvent(ctx, userUID, title, content, extraData, methods)
	return err
}

// SendScheduledNotification 发送定时通知
func (h *NotificationHelper) SendScheduledNotification(
	ctx context.Context,
	userUID uuid.UUID,
	eventType EventType,
	scheduleAt time.Time,
	methods []NotificationMethod,
	extraData map[string]any,
) error {
	// 事件驱动的通知系统不支持定时发送，这个功能需要外部调度系统来实现
	// 这里直接发送通知
	title := "定时通知"
	content := "这是一个定时通知"
	if extraData != nil {
		if t, ok := extraData["title"].(string); ok {
			title = t
		}
		if c, ok := extraData["content"].(string); ok {
			content = c
		}
	}

	_, err := h.service.HandleCustomEvent(ctx, userUID, title, content, extraData, methods)
	return err
}

// BatchNotificationRequest 批量通知请求
type BatchNotificationRequest struct {
	UserUID      uuid.UUID            `json:"user_uid"`
	EventType    EventType            `json:"event_type"`
	Methods      []NotificationMethod `json:"methods"`
	Priority     NotificationPriority `json:"priority"`
	Title        string               `json:"title"`
	Content      string               `json:"content"`
	TemplateData map[string]any       `json:"template_data"`
}

// SendBatchNotifications 批量发送通知
func (h *NotificationHelper) SendBatchNotifications(
	ctx context.Context,
	requests []BatchNotificationRequest,
) ([]*NotificationResult, error) {
	var allResults []*NotificationResult
	var errors []string

	for _, req := range requests {
		extraData := req.TemplateData
		if extraData == nil {
			extraData = make(map[string]any)
		}

		results, err := h.service.HandleCustomEvent(
			ctx,
			req.UserUID,
			req.Title,
			req.Content,
			extraData,
			req.Methods,
		)
		if err != nil {
			errors = append(
				errors,
				fmt.Sprintf("failed to send notification to user %s: %v", req.UserUID, err),
			)
		}

		allResults = append(allResults, results...)
	}

	var finalError error
	if len(errors) > 0 {
		finalError = fmt.Errorf("batch notification errors: %v", errors)
	}

	return allResults, finalError
}
