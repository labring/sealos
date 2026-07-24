package monitor

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/labring/sealos/service/exceptionmonitor/api"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

func checkPerformance(notificationInfo *api.Info, checkType string) (float64, error) {
	params := url.Values{}
	params.Add("namespace", notificationInfo.Namespace)
	params.Add("app", notificationInfo.DatabaseClusterName)
	params.Add("type", notificationInfo.DatabaseType)
	params.Add("query", checkType)

	urlStr := api.BaseURL + "?" + params.Encode()

	req, err := http.NewRequest(http.MethodGet, urlStr, nil)
	if err != nil {
		return 0.0, err
	}

	kubeconfig, err := getKubeConfig(notificationInfo.Namespace)
	if err != nil {
		return 0.0, err
	}
	req.Header.Add("Authorization", kubeconfig)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return 0.0, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0.0, err
	}
	var result api.QueryResult
	if err := json.Unmarshal(body, &result); err != nil {
		return 0.0, err
	}
	maxUsage := 0.0
	for _, res := range result.Data.Result {
		if len(res.Value) < 2 {
			return 0.0, fmt.Errorf("unexpected query result value length: %d", len(res.Value))
		}
		value, ok := res.Value[1].(string)
		if !ok {
			return 0.0, fmt.Errorf("unexpected query result value type: %T", res.Value[1])
		}
		usage, err := strconv.ParseFloat(value, 64)
		if err != nil {
			return 0.0, err
		}
		if maxUsage < usage {
			maxUsage = usage
		}
	}
	return maxUsage, nil
}

func getKubeConfig(namespace string) (string, error) {
	if !strings.Contains(namespace, "ns-") {
		return "", fmt.Errorf("invalid namespace format for %s", namespace)
	}
	userName := strings.Split(namespace, "-")[1]

	user, err := api.DynamicClient.Resource(userGVR).
		Namespace("").
		Get(context.TODO(), userName, metav1.GetOptions{})
	if err != nil {
		return "", err
	}
	kubeConfig, found, err := unstructured.NestedString(
		user.UnstructuredContent(),
		"status",
		"kubeConfig",
	)
	if err != nil {
		return "", err
	}
	if !found {
		return "", err
	}
	kubeConfig = strings.ReplaceAll(kubeConfig, ":", "%3A")
	kubeConfig = strings.ReplaceAll(kubeConfig, " ", "%20")
	kubeConfig = strings.ReplaceAll(kubeConfig, "\n", "%0A")
	return kubeConfig, nil
}
