package notification

import (
	"bytes"
	"encoding/json"
	"exceptionMonitor/api"
	"fmt"
	"net/http"
)

func GetNotificationMessage(databaseClusterName, namespace, status, debtLevel, events, reason string) string {
	if status == "Running" || status == "Stopped" {
		card := map[string]interface{}{
			"config": map[string]bool{
				"wide_screen_mode": true,
			},
			"elements": []map[string]interface{}{
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
			},
			"header": map[string]interface{}{
				"template": "blue",
				"title": map[string]string{
					"content": "数据库恢复通知",
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
	} else {
		card := map[string]interface{}{
			"config": map[string]bool{
				"wide_screen_mode": true,
			},
			"elements": []map[string]interface{}{
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
			},
			"header": map[string]interface{}{
				"template": "red",
				"title": map[string]string{
					"content": "数据库异常告警",
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
}

func SendFeishuNotification(database_message, feishuWebHook string) error {

	if api.MonitorType != "all" {
		feishuWebHook = api.FeishuWebhookURL4
	}

	// Create a map to hold the POST request body
	bodyMap := map[string]interface{}{
		"msg_type": "interactive",
		"card":     database_message,
	}

	// Convert the map to a JSON byte slice
	bodyBytes, err := json.Marshal(bodyMap)
	if err != nil {
		fmt.Println("Error marshalling JSON:", err)
		return nil
	}

	// Create a new HTTP request
	req, err := http.NewRequest("POST", feishuWebHook, bytes.NewBuffer(bodyBytes))
	if err != nil {
		fmt.Println("Error creating request:", err)
		return nil
	}

	// Set the request header
	req.Header.Set("Content-Type", "application/json")

	// Send the request using the default client
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Println("Error sending request:", err)
		return nil
	}
	defer resp.Body.Close()

	// Print the status and response body
	fmt.Println("Status code:", resp.Status)
	buf := new(bytes.Buffer)
	buf.ReadFrom(resp.Body)
	fmt.Println("Response body:", buf.String())
	return nil
}
