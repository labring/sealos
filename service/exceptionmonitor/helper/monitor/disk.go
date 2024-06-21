package monitor

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"

	"github.com/labring/sealos/service/exceptionmonitor/helper/notification"

	"github.com/labring/sealos/service/exceptionmonitor/api"
)

const (
	databaseDiskMonitorThreshold      = 85.0
	databaseExceptionMonitorThreshold = 99.0
)

func checkDisk(namespace, databaseClusterName, databaseType, UID, checkType string) (bool, error) {
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
		fmt.Println(databaseClusterName, checkType, usage)
	}
	if checkType == "databaseDiskExceptionCheck" {
		if usage >= databaseDiskMonitorThreshold {
			ownerNS, err := GetNSOwner(namespace)
			fmt.Println("aaaaaaa")
			if err != nil {
				return false, err
			}
			if api.DiskMonitorNamespaceMap[UID] {
				return false, nil
			}
			err = notification.SendToSms(ownerNS, databaseClusterName, api.ClusterName, "磁盘超过百分之八十")
			if err != nil {
				return false, err
			}
			return true, nil
		} else {
			fmt.Println("bbbbbb")
			delete(api.DiskMonitorNamespaceMap, UID)
			fmt.Println(api.DiskMonitorNamespaceMap)
			return false, nil
		}
	}

	if usage > databaseExceptionMonitorThreshold {
		return true, nil
	}

	return false, nil
}
