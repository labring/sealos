package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// sendAlert sends Feishu alert
func (m *Monitor) sendAlert(
	ctx context.Context,
	nodeName string,
	duration time.Duration,
) error {
	var message string
	if m.clusterName != "" {
		message = fmt.Sprintf(
			alertFormatWithCluster,
			m.clusterName,
			nodeName,
			duration.Round(time.Second).String(),
			time.Now().Format(time.DateTime),
		)
	} else {
		message = fmt.Sprintf(
			alertFormat,
			nodeName,
			duration.Round(time.Second).String(),
			time.Now().Format(time.DateTime),
		)
	}

	feishuMsg := FeishuMessage{
		MsgType: "text",
		Content: map[string]any{
			"text": message,
		},
	}

	jsonData, err := json.Marshal(feishuMsg)
	if err != nil {
		return fmt.Errorf("error marshaling feishu message: %w", err)
	}

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		m.feishuWebhook,
		bytes.NewReader(jsonData),
	)
	if err != nil {
		return fmt.Errorf("error creating http request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := m.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("error sending feishu alert: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= http.StatusOK &&
		resp.StatusCode < http.StatusMultipleChoices {
		return nil
	}

	var body bytes.Buffer

	_, err = body.ReadFrom(resp.Body)
	if err != nil {
		return fmt.Errorf("error reading feishu response body: %w", err)
	}

	return fmt.Errorf("feishu webhook returned status code: %d, body: %s",
		resp.StatusCode, body.String())
}
