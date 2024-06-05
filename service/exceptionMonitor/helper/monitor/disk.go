package monitor

import (
	"encoding/json"
	"exceptionMonitor/api"
	"exceptionMonitor/helper/notification"
	"io"
	"net/http"
	"net/url"
	"strconv"
)

func checkDisk(namespace, databaseClusterName, databaseType string) (bool, error) {
	var kubeconfig string
	params := url.Values{}
	params.Add("namespace", namespace)
	params.Add("app", databaseClusterName)
	params.Add("type", databaseType)
	params.Add("query", "disk")

	urlStr := api.BaseURL + "?" + params.Encode()

	req, err := http.NewRequest("GET", urlStr, nil)
	if err != nil {
		return false, err
	}
	kubeconfig, err = getKubeConfig(namespace)
	if err != nil {
		return false, err
	}
	req.Header.Add("Authorization", kubeconfig)
	// Create an HTTP client and send the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, err
	}
	var result *api.QueryResult
	if err := json.Unmarshal(body, &result); err != nil {
		return false, err
	}

	usage := 0.0
	for _, result := range result.Data.Result {
		value := result.Value[1].(string)
		usage, err = strconv.ParseFloat(value, 64)
		if err != nil {
			return false, err
		}
	}
	if usage > 99 {
		return true, nil
	}
	if usage > 80 {
		_, ownerNS := GetNSOwner(namespace)
		err = notification.SendToSms(ownerNS, databaseClusterName, api.ClusterName, "磁盘超过百分之八十")
	}
	if err != nil {
		return false, err
	}
	return false, nil
}
