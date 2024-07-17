package notification

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/labring/sealos/service/exceptionmonitor/api"
)

const ExceptionType = "exception"

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

func SendFeishuNotification(message, feishuWebHook string) error {
	//log.Print(message, feishuWebHook)
	if api.MonitorType != "all" {
		feishuWebHook = api.FeishuWebhookURLMap["FeishuWebhookURLImportant"]
	}

	// Create a map to hold the POST request body
	bodyMap := map[string]interface{}{
		"msg_type": "interactive",
		"card":     message,
	}

	// Convert the map to a JSON byte slice
	bodyBytes, err := json.Marshal(bodyMap)
	if err != nil {
		return err
	}

	// Create a new HTTP request
	req, err := http.NewRequest("POST", feishuWebHook, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return err
	}

	// Set the request header
	req.Header.Set("Content-Type", "application/json")

	// Send the request using the default client
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// Print the status and response body
	buf := new(bytes.Buffer)
	_, err = buf.ReadFrom(resp.Body)
	if err != nil {
		return err
	}
	return nil
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
