package notification

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"regexp"
	"time"

	"github.com/labring/sealos/service/exceptionmonitor/api"
	lark "github.com/larksuite/oapi-sdk-go/v3"
	larkcore "github.com/larksuite/oapi-sdk-go/v3/core"
	larkim "github.com/larksuite/oapi-sdk-go/v3/service/im/v1"
)

const ExceptionType = "exception"

var (
	feiShuClient *lark.Client
)

type Info struct {
	DatabaseClusterName string
	Namespace           string
	Status              string
	DebtLevel           string
	Events              string
	Reason              string
	NotificationType    string
	DiskUsage           string
	CPUUsage            string
	MemUsage            string
	PerformanceType     string
	ExceptionType       string
}

func InitFeishuClient() {
	feiShuClient = lark.NewClient(api.APPID, api.APPSECRET)
}

func GetNotificationMessage(notificationInfo Info) string {
	headerTemplate := "red"
	titleContent := "数据库" + notificationInfo.ExceptionType + "告警"
	usage := ""
	if notificationInfo.PerformanceType == "CPU" {
		usage = notificationInfo.CPUUsage
	} else if notificationInfo.PerformanceType == "内存" {
		usage = notificationInfo.MemUsage
	} else if notificationInfo.PerformanceType == "磁盘" {
		usage = notificationInfo.DiskUsage
	}
	var elements []map[string]interface{}

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
				"content": fmt.Sprintf("数据库状态：%s", notificationInfo.Status),
				"tag":     "lark_md",
			},
		},
	}

	if notificationInfo.NotificationType == ExceptionType && notificationInfo.ExceptionType == "状态" {
		exceptionElements := []map[string]interface{}{
			{
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
		elements = append(commonElements, exceptionElements...)
	} else if notificationInfo.ExceptionType == "阀值" {
		exceptionElements := []map[string]interface{}{
			{
				"tag": "div",
				"text": map[string]string{
					"content": fmt.Sprintf("%s使用率：%s", notificationInfo.PerformanceType, usage),
					"tag":     "lark_md",
				},
			},
		}
		elements = append(commonElements, exceptionElements...)
	}

	if notificationInfo.NotificationType == "recovery" {
		headerTemplate = "blue"
		titleContent = "数据库" + notificationInfo.ExceptionType + "恢复通知"

		elements = commonElements
		if notificationInfo.ExceptionType == "阀值" {
			exceptionElements := []map[string]interface{}{
				{
					"tag": "div",
					"text": map[string]string{
						"content": fmt.Sprintf("%s使用率：%s", notificationInfo.PerformanceType, usage),
						"tag":     "lark_md",
					},
				},
			}
			elements = append(elements, exceptionElements...)
		}
		exceptionElements := []map[string]interface{}{
			{
				"tag": "div",
				"text": map[string]string{
					"content": fmt.Sprintf("数据库恢复时间：%s", time.Now().Add(8*time.Hour).Format("2006-01-02 15:04:05")),
					"tag":     "lark_md",
				},
			},
		}
		elements = append(elements, exceptionElements...)
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

func SendFeishuNotification(notification Info, message, feishuWebHook string) error {
	if api.MonitorType != "all" {
		feishuWebHook = api.FeishuWebhookURLMap["FeishuWebhookURLImportant"]
	}

	messageIDMap := getMessageIDMap(notification.PerformanceType)

	if messageID, ok := messageIDMap[notification.DatabaseClusterName]; ok {
		if err := updateFeishuNotification(messageID, message); err != nil {
			return err
		}
		delete(messageIDMap, notification.DatabaseClusterName)
	} else {
		if err := createFeishuNotification(notification, message, feishuWebHook, messageIDMap); err != nil {
			return err
		}
	}
	return nil
}

func getMessageIDMap(performanceType string) map[string]string {
	switch performanceType {
	case "磁盘":
		return api.DatabaseDiskMessageIDMap
	case "内存":
		return api.DatabaseMemMessageIDMap
	case "CPU":
		return api.DatabaseCPUMessageIDMap
	case "Backup":
		return api.DatabaseBackupMessageIDMap
	default:
		return api.DatabaseStatusMessageIDMap
	}
}

func updateFeishuNotification(messageID, message string) error {
	req := larkim.NewPatchMessageReqBuilder().
		MessageId(messageID).
		Body(larkim.NewPatchMessageReqBodyBuilder().
			Content(message).Build()).Build()

	fmt.Println(messageID)
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

func createFeishuNotification(notification Info, message, feishuWebHook string, messageIDMap map[string]string) error {
	req := larkim.NewCreateMessageReqBuilder().
		ReceiveIdType("chat_id").
		Body(larkim.NewCreateMessageReqBodyBuilder().
			ReceiveId(feishuWebHook).
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
	if notification.DatabaseClusterName == "Backup" {
		return nil
	}
	if messageID == "" {
		log.Printf("send databaseName %s feishu notification, return no messageID", notification.DatabaseClusterName)
	} else {
		messageIDMap[notification.DatabaseClusterName] = messageID
	}
	fmt.Println(messageIDMap)
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

func createElements(namespace, backupName, status, startTime, reason string, includeReason bool) []map[string]string {
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
		elements := createElements(namespace, backupName, status, startTime, reason, true)
		card = createCard("red", "备份异常通知", elements)
	} else {
		elements := createElements(namespace, backupName, status, startTime, "", false)
		card = createCard("blue", "备份恢复通知", elements)
	}

	databaseMessage, err := marshalCard(card)
	if err != nil {
		fmt.Println(err)
		return ""
	}
	return databaseMessage
}
