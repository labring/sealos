package monitor

import (
	"encoding/json"
	"exceptionMonitor/api"
	"exceptionMonitor/helper/notification"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
)

func checkDisk(namespace, databaseClusterName, databaseType string) (bool, error) {
	baseURL := "http://database-monitor.sealos.svc:9090/q"
	if api.ClusterName == "io" {
		baseURL = "http://monitor-system.monitor-system.svc:9090/q"
	}
	params := url.Values{}
	params.Add("namespace", namespace)
	params.Add("app", databaseClusterName)
	params.Add("type", databaseType)
	params.Add("query", "disk")

	urlStr := baseURL + "?" + params.Encode()

	req, err := http.NewRequest("GET", urlStr, nil)
	if err != nil {
		return false, fmt.Errorf("error creating HTTP request: %v", err)
	}
	kubeconfig := getKubeConfig(namespace)
	req.Header.Add("Authorization", kubeconfig)
	// Create an HTTP client and send the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return false, fmt.Errorf("error sending HTTP request: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, fmt.Errorf("error reading response body: %v", err)
	}
	var result *api.QueryResult
	if err := json.Unmarshal(body, &result); err != nil {
		return false, fmt.Errorf("error decoding JSON: %v", err)
	}

	usage := 0.0
	for _, result := range result.Data.Result {
		value := result.Value[1].(string)
		usage, err = strconv.ParseFloat(value, 64)
		if err != nil {
			return false, fmt.Errorf("error parsing float: %v", err)
		}
	}
	if usage > 80 {
		return true, nil
	} else {
		if usage > 80 {
			_, ownerNS := GetNSOwner(namespace)
			notification.SendToSms(ownerNS, databaseClusterName, api.ClusterName, "磁盘超过百分之八十")
		}
		return false, nil
	}
}
