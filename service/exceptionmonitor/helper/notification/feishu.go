package notification

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"regexp"

	"github.com/labring/sealos/service/exceptionmonitor/api"
	lark "github.com/larksuite/oapi-sdk-go/v3"
	larkcore "github.com/larksuite/oapi-sdk-go/v3/core"
	larkim "github.com/larksuite/oapi-sdk-go/v3/service/im/v1"
)

const ExceptionType = "exception"

var (
	feiShuClient *lark.Client
)

func InitFeishuClient() {
	feiShuClient = lark.NewClient(api.APPID, api.APPSECRET)
}

func GetCockroachMessage(errMessage, cockroachType string) string {
	headerTemplate := "red"
	titleContent := "小强数据库异常告警"
	elements := []map[string]interface{}{
		{
			"tag": "div",
			"text": map[string]string{
				"content": fmt.Sprintf("集群环境：%s", api.ClusterName),
				"tag":     "lark_md",
			},
		},
		{
			"tag": "div",
			"text": map[string]string{
				"content": fmt.Sprintf("数据库类型：%s", cockroachType),
				"tag":     "lark_md",
			},
		},
		{
			"tag": "div",
			"text": map[string]string{
				"content": fmt.Sprintf("异常信息：%s", errMessage),
				"tag":     "lark_md",
			},
		},
	}
	card := map[string]interface{}{
		"config": map[string]bool{
			"wide_screen_mode": true,
		},
		"elements": elements,
		"header": map[string]interface{}{
			"template": headerTemplate,
			"title": map[string]string{
				"content": titleContent,
				"tag":     "plain_text",
			},
		},
	}

	databaseMessage, err := json.Marshal(card)
	if err != nil {
		fmt.Println("Error marshaling JSON:", err)
		return ""
	}
	return string(databaseMessage)
}

func GetNotificationMessage(notificationInfo *api.Info) string {
	headerTemplate := "red"
	titleContent := "数据库" + notificationInfo.ExceptionType + "告警"
	usage := ""
	if notificationInfo.PerformanceType == api.CPUChinese {
		usage = notificationInfo.CPUUsage
	} else if notificationInfo.PerformanceType == api.MemoryChinese {
		usage = notificationInfo.MemUsage
	} else if notificationInfo.PerformanceType == api.DiskChinese {
		usage = notificationInfo.DiskUsage
	}

	commonElements := []map[string]interface{}{
		{
			"tag": "div",
			"text": map[string]string{
				"content": fmt.Sprintf("集群环境：%s", api.ClusterName),
				"tag":     "lark_md",
			},
		},
		{
			"tag": "div",
			"text": map[string]string{
				"content": fmt.Sprintf("命名空间：%s", notificationInfo.Namespace),
				"tag":     "lark_md",
			},
		},
		{
			"tag": "div",
			"text": map[string]string{
				"content": fmt.Sprintf("数据库名：%s", notificationInfo.DatabaseClusterName),
				"tag":     "lark_md",
			},
		},
		{
			"tag": "div",
			"text": map[string]string{
				"content": fmt.Sprintf("数据库状态：%s", notificationInfo.ExceptionStatus),
				"tag":     "lark_md",
			},
		},
	}

	if notificationInfo.NotificationType == ExceptionType && notificationInfo.ExceptionType == "状态" {
		exceptionElements := []map[string]interface{}{
			{
				"tag": "div",
				"text": map[string]string{
					"content": fmt.Sprintf("数据库异常时间：%s", notificationInfo.ExceptionStatusTime),
					"tag":     "lark_md",
				},
			}, {
				"tag": "div",
				"text": map[string]string{
					"content": fmt.Sprintf("欠费级别：%s", notificationInfo.DebtLevel),
					"tag":     "lark_md",
				},
			},
			{
				"tag": "div",
				"text": map[string]string{
					"content": fmt.Sprintf("事件信息：%s", notificationInfo.Events),
					"tag":     "lark_md",
				},
			},
			{
				"tag": "div",
				"text": map[string]string{
					"content": fmt.Sprintf("告警原因：%s", notificationInfo.Reason),
					"tag":     "lark_md",
				},
			},
		}
		notificationInfo.FeishuInfo = append(commonElements, exceptionElements...)
	} else if notificationInfo.NotificationType == ExceptionType && notificationInfo.ExceptionType == "阀值" {
		exceptionElements := []map[string]interface{}{
			{
				"tag": "div",
				"text": map[string]string{
					"content": fmt.Sprintf("%s使用率：%s", notificationInfo.PerformanceType, usage),
					"tag":     "lark_md",
				},
			},
		}
		notificationInfo.FeishuInfo = append(commonElements, exceptionElements...)
	}

	if notificationInfo.NotificationType == "recovery" {
		headerTemplate = "blue"
		titleContent = "数据库" + notificationInfo.ExceptionType + "恢复通知"

		separatorElements := []map[string]interface{}{
			{
				"tag": "div",
				"text": map[string]string{
					"content": "-------------------------------------数据库恢复信息-------------------------------------",
					"tag":     "lark_md",
				},
			},
		}
		notificationInfo.FeishuInfo = append(notificationInfo.FeishuInfo, separatorElements...)

		if notificationInfo.ExceptionType == "阀值" {
			usageRecoveryElements := []map[string]interface{}{
				{
					"tag": "div",
					"text": map[string]string{
						"content": fmt.Sprintf("%s使用率：%s", notificationInfo.PerformanceType, usage),
						"tag":     "lark_md",
					},
				},
			}
			notificationInfo.FeishuInfo = append(notificationInfo.FeishuInfo, usageRecoveryElements...)
		}
		recoveryTimeElements := []map[string]interface{}{
			{
				"tag": "div",
				"text": map[string]string{
					"content": fmt.Sprintf("数据库状态：%s", notificationInfo.RecoveryStatus),
					"tag":     "lark_md",
				},
			},
			{
				"tag": "div",
				"text": map[string]string{
					"content": fmt.Sprintf("数据库恢复时间：%s", notificationInfo.RecoveryTime),
					"tag":     "lark_md",
				},
			},
		}
		notificationInfo.FeishuInfo = append(notificationInfo.FeishuInfo, recoveryTimeElements...)
	}
	card := map[string]interface{}{
		"config": map[string]bool{
			"wide_screen_mode": true,
		},
		"elements": notificationInfo.FeishuInfo,
		"header": map[string]interface{}{
			"template": headerTemplate,
			"title": map[string]string{
				"content": titleContent,
				"tag":     "plain_text",
			},
		},
	}

	databaseMessage, err := json.Marshal(card)
	if err != nil {
		fmt.Println("Error marshaling JSON:", err)
		return ""
	}
	return string(databaseMessage)
}

func SendFeishuNotification(notification *api.Info, message string) error {
	if api.MonitorType != "all" {
		notification.FeishuWebHook = api.FeishuWebhookURLMap["FeishuWebhookURLImportant"]
	}

	messageIDMap := getMessageIDMap(notification.PerformanceType)

	if messageID, ok := messageIDMap[notification.DatabaseClusterName]; ok {
		if err := updateFeishuNotification(messageID, message); err != nil {
			return err
		}
		delete(messageIDMap, notification.DatabaseClusterName)
	} else {
		if err := createFeishuNotification(notification, message, messageIDMap); err != nil {
			return err
		}
	}
	return nil
}

func getMessageIDMap(performanceType string) map[string]string {
	switch performanceType {
	case api.DiskChinese:
		return api.DatabaseDiskMessageIDMap
	case api.MemoryChinese:
		return api.DatabaseMemMessageIDMap
	case api.CPUChinese:
		return api.DatabaseCPUMessageIDMap
	case "Backup":
		return api.DatabaseBackupMessageIDMap
	case "Quota":
		return api.QuotaMessageIDMap
	default:
		return api.DatabaseStatusMessageIDMap
	}
}

func updateFeishuNotification(messageID, message string) error {
	req := larkim.NewPatchMessageReqBuilder().
		MessageId(messageID).
		Body(larkim.NewPatchMessageReqBodyBuilder().
			Content(message).Build()).Build()
	resp, err := feiShuClient.Im.Message.Patch(context.Background(), req)
	if err != nil {
		log.Println("Error:", err)
		return err
	}

	if !resp.Success() {
		log.Println("Error:", resp.Code, resp.Msg, resp.RequestId())
		return err
	}
	return nil
}

func createFeishuNotification(notification *api.Info, message string, messageIDMap map[string]string) error {
	req := larkim.NewCreateMessageReqBuilder().
		ReceiveIdType("chat_id").
		Body(larkim.NewCreateMessageReqBodyBuilder().
			ReceiveId(notification.FeishuWebHook).
			MsgType("interactive").
			Content(message).Build()).Build()

	resp, err := feiShuClient.Im.Message.Create(context.Background(), req)

	if err != nil {
		log.Println("Error:", err)
		return err
	}

	if !resp.Success() {
		log.Println("Error:", resp.Code, resp.Msg, resp.RequestId())
		return err
	}

	respStr := larkcore.Prettify(resp)
	messageID := extractAndPrintMessageID(respStr)
	if notification.PerformanceType == "Backup" || notification.PerformanceType == "Quota" {
		return nil
	}
	if messageID == "" {
		log.Printf("send databaseName %s feishu notification, return no messageID", notification.DatabaseClusterName)
	} else {
		messageIDMap[notification.DatabaseClusterName] = messageID
	}
	return nil
}

func extractAndPrintMessageID(str string) string {
	re := regexp.MustCompile(`MessageId:\s*"([^"]+)"`)
	match := re.FindStringSubmatch(str)
	if len(match) > 1 {
		return match[1]
	}
	return ""
}

func createCard(headerTemplate, headerTitle string, elements []map[string]string) map[string]interface{} {
	card := map[string]interface{}{
		"config": map[string]bool{
			"wide_screen_mode": true,
		},
		"elements": make([]map[string]interface{}, len(elements)),
		"header": map[string]interface{}{
			"template": headerTemplate,
			"title": map[string]string{
				"content": headerTitle,
				"tag":     "plain_text",
			},
		},
	}

	for i, element := range elements {
		card["elements"].([]map[string]interface{})[i] = map[string]interface{}{
			"tag": "div",
			"text": map[string]string{
				"content": fmt.Sprintf("%s：%s", element["label"], element["value"]),
				"tag":     "lark_md",
			},
		}
	}

	return card
}

func GetQuotaMessage(nsQuota *api.NameSpaceQuota) string {
	var card map[string]interface{}
	elements := createQuotaElements(nsQuota)
	card = createCard("red", "Quota阀值通知", elements)

	databaseMessage, err := marshalCard(card)
	if err != nil {
		fmt.Println(err)
		return ""
	}
	return databaseMessage
}

func createQuotaElements(nsQuota *api.NameSpaceQuota) []map[string]string {
	elements := []map[string]string{
		{"label": "集群环境", "value": api.ClusterName},
		{"label": "命名空间", "value": nsQuota.NameSpace},
	}
	addNonEmptyFieldsToElements(nsQuota, &elements)
	return elements
}

func addNonEmptyFieldsToElements(nsQuota *api.NameSpaceQuota, elements *[]map[string]string) {
	fields := map[string]string{
		"CPULimit":              "CPU总量",
		"CPUUsage":              "CPU使用率",
		"MemLimit":              "内存总量",
		"MemUsage":              "内存使用率",
		"GPULimit":              "GPU总量",
		"GPUUsage":              "GPU使用率",
		"EphemeralStorageLimit": "临时存储总量",
		"EphemeralStorageUsage": "临时存储使用率",
		"ObjectStorageLimit":    "对象存储总量",
		"ObjectStorageUsage":    "对象存储使用率",
		"NodePortLimit":         "节点端口总量",
		"NodePortUsage":         "节点端口使用率",
		"StorageLimit":          "存储总量",
		"StorageUsage":          "存储使用率",
	}

	quotaValues := map[string]string{
		"CPULimit":              nsQuota.CPULimit,
		"CPUUsage":              nsQuota.CPUUsage,
		"MemLimit":              nsQuota.MemLimit,
		"MemUsage":              nsQuota.MemUsage,
		"GPULimit":              nsQuota.GPULimit,
		"GPUUsage":              nsQuota.GPUUsage,
		"EphemeralStorageLimit": nsQuota.EphemeralStorageLimit,
		"EphemeralStorageUsage": nsQuota.EphemeralStorageUsage,
		"ObjectStorageLimit":    nsQuota.ObjectStorageLimit,
		"ObjectStorageUsage":    nsQuota.ObjectStorageUsage,
		"NodePortLimit":         nsQuota.NodePortLimit,
		"NodePortUsage":         nsQuota.NodePortUsage,
		"StorageLimit":          nsQuota.StorageLimit,
		"StorageUsage":          nsQuota.StorageUsage,
	}

	for field, label := range fields {
		value := quotaValues[field]
		if value != "" {
			*elements = append(*elements, map[string]string{
				"label": label,
				"value": value,
			})
		}
	}
}

func createBackupElements(namespace, backupName, status, startTime, reason string, includeReason bool) []map[string]string {
	elements := []map[string]string{
		{"label": "集群环境", "value": api.ClusterName},
		{"label": "命名空间", "value": namespace},
		{"label": "备份名", "value": backupName},
		{"label": "备份状态", "value": status},
		{"label": "备份开始时间", "value": startTime},
	}
	if includeReason {
		elements = append(elements, map[string]string{"label": "备份异常原因", "value": reason})
	}
	return elements
}

func marshalCard(card map[string]interface{}) (string, error) {
	databaseMessage, err := json.Marshal(card)
	if err != nil {
		return "", fmt.Errorf("error marshaling JSON: %w", err)
	}
	return string(databaseMessage), nil
}

func GetBackupMessage(notificationType, namespace, backupName, status, startTime, reason string) string {
	var card map[string]interface{}
	if notificationType == ExceptionType {
		elements := createBackupElements(namespace, backupName, status, startTime, reason, true)
		card = createCard("red", "备份异常通知", elements)
	} else {
		elements := createBackupElements(namespace, backupName, status, startTime, "", false)
		card = createCard("blue", "备份恢复通知", elements)
	}

	databaseMessage, err := marshalCard(card)
	if err != nil {
		fmt.Println(err)
		return ""
	}
	return databaseMessage
}
