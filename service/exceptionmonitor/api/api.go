package api

import (
	"errors"
	"os"
	"strings"

	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
)

type QueryResult struct {
	Status string `json:"status"`
	Data   struct {
		ResultType string `json:"resultType"`
		Result     []struct {
			Metric map[string]string `json:"metric"`
			Values [][]interface{}   `json:"values"`
			Value  []interface{}     `json:"value"`
		} `json:"result"`
	} `json:"data"`
}

var (
	ClientSet     *kubernetes.Clientset
	DynamicClient *dynamic.DynamicClient
	// records the last database status
	LastDatabaseClusterStatus = make(map[string]string)
	// record the debt ns
	ExceptionDatabaseMap   = make(map[string]bool)
	FeishuWebHookMap       = make(map[string]string)
	DebtNamespaceMap       = make(map[string]bool)
	DiskFullNamespaceMap   = make(map[string]bool)
	ExceededQuotaException = "exceeded quota"
	DiskException          = "Writing to log file failed"
	OwnerLabel             = "user.sealos.io/owner"
	DatabaseTypeLabel      = "clusterdefinition.kubeblocks.io/name"
	ClusterName            string
	MonitorType            string
	ClusterNS              []string
	FeishuWebhookURLMap    = map[string]string{}
	ClusterRegionMap       = map[string]string{}
	BaseURL                string
)

func GetENV() error {
	var missingEnvVars []string

	BaseURL = getEnvWithCheck("BaseURL", &missingEnvVars)
	ClusterName = getEnvWithCheck("ClusterName", &missingEnvVars)
	MonitorType = getEnvWithCheck("MonitorType", &missingEnvVars)
	clusterNS := getEnvWithCheck("ClusterNS", &missingEnvVars)
	if clusterNS != "" {
		ClusterNS = strings.Split(clusterNS, ",")
	}

	// Get FeishuWebhookURLMap
	getEnvMapWithCheck([]string{
		//Updating、Failed、Abnormal
		"FeishuWebhookURLUFA",
		//Creating、Stopping、Deleteting
		"FeishuWebhookURLCSD",
		//Exceeded Quota、Disk Is Full
		"FeishuWebhookURLOther",
		//Important Cluster NS
		"FeishuWebhookURLImportant",
	}, FeishuWebhookURLMap, &missingEnvVars)

	// Get ClusterRegionMap
	getEnvMapWithCheck([]string{
		"REGION_IO",
		"REGION_BJA",
		"REGION_HZH",
		"REGION_GZG",
		"REGION_TOP",
	}, ClusterRegionMap, &missingEnvVars)

	if len(missingEnvVars) > 0 {
		return errors.New("missing environment variables")
	}
	return nil
}

func getEnvWithCheck(key string, missingEnvVars *[]string) string {
	value := os.Getenv(key)
	if value == "" {
		if MonitorType == "all" && key == "ClusterNS" {
			return value
		}
		*missingEnvVars = append(*missingEnvVars, key)
	}
	return value
}

func getEnvMapWithCheck(keys []string, targetMap map[string]string, missingEnvVars *[]string) {
	for _, key := range keys {
		value := getEnvWithCheck(key, missingEnvVars)
		if value != "" {
			targetMap[key] = value
		}
	}
}
