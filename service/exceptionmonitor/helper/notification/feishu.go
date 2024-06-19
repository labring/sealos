package notification

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/labring/sealos/service/exceptionmonitor/api"
)

func GetNotificationMessage(databaseClusterName, namespace, status, debtLevel, events, reason string) string {
	isNormal := status == "Running" || status == "Stopped"
	headerTemplate := "red"
	titleContent := "数据库异常告警"
	var elements []map[string]interface{}

	commonElements := []map[string]interface{}{
		{
			"tag": "div",
			"text": map[string]string{
				"content": fmt.Sprintf("集群环境：%s", api.ClusterRegionMap[api.ClusterName]),
				"tag":     "lark_md",
			},
		},
		{
			"tag": "div",
			"text": map[string]string{
				"content": fmt.Sprintf("命名空间：%s", namespace),
				"tag":     "lark_md",
			},
		},
		{
			"tag": "div",
			"text": map[string]string{
				"content": fmt.Sprintf("数据库名：%s", databaseClusterName),
				"tag":     "lark_md",
			},
		},
		{
			"tag": "div",
			"text": map[string]string{
				"content": fmt.Sprintf("数据库状态：%s", status),
				"tag":     "lark_md",
			},
		},
	}
	if isNormal {
		headerTemplate = "blue"
		titleContent = "数据库恢复通知"
		elements = commonElements
	} else {
		exceptionElements := []map[string]interface{}{
			{
				"tag": "div",
				"text": map[string]string{
					"content": fmt.Sprintf("欠费级别：%s", debtLevel),
					"tag":     "lark_md",
				},
			},
			{
				"tag": "div",
				"text": map[string]string{
					"content": fmt.Sprintf("事件信息：%s", events),
					"tag":     "lark_md",
				},
			},
			{
				"tag": "div",
				"text": map[string]string{
					"content": fmt.Sprintf("告警原因：%s", reason),
					"tag":     "lark_md",
				},
			},
		}
		elements = append(commonElements, exceptionElements...)
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
