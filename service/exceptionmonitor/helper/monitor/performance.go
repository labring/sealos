package monitor

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/labring/sealos/service/exceptionmonitor/api"
)

func checkPerformance(namespace, databaseClusterName, databaseType, checkType string) (float64, error) {
	params := url.Values{}
	params.Add("namespace", namespace)
	params.Add("app", databaseClusterName)
	params.Add("type", databaseType)
	params.Add("query", checkType)

	urlStr := api.BaseURL + "?" + params.Encode()

	req, err := http.NewRequest("GET", urlStr, nil)
	if err != nil {
		return 0.0, err
	}

	kubeconfig, err := getKubeConfig(namespace)
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
	usage, maxUsage := 0.0, 0.0
	for _, res := range result.Data.Result {
		value := res.Value[1].(string)
		usage, err = strconv.ParseFloat(value, 64)
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
	userName := strings.Split(namespace, "-")[1]
	user, err := api.DynamicClient.Resource(userGVR).Namespace("").Get(context.TODO(), userName, metav1.GetOptions{})
	if err != nil {
		return "", err
	}
	kubeConfig, found, err := unstructured.NestedString(user.UnstructuredContent(), "status", "kubeConfig")
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
