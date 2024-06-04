package api

import (
	"fmt"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"os"
	"strings"
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
	FeishuWebhookURLMap    = map[string]string{
		//Updating、Failed、Abnormal
		"FeishuWebhookURLUFA": "",
		//Creating、Stopping、Deleteting
		"FeishuWebhookURLCSD": "",
		//exceeded quota、disk is full
		"FeishuWebhookURLOther": "",
		//important cluster ns
		"FeishuWebhookURLImportant": "",
	}
)

func GetENV() error {
	var missingEnvVars []string

	ClusterName = os.Getenv("ClusterName")
	if ClusterName == "" {
		missingEnvVars = append(missingEnvVars, "ClusterName")
	}

	MonitorType = os.Getenv("MonitorType")
	if MonitorType == "" {
		missingEnvVars = append(missingEnvVars, "MonitorType")
	}

	clusterNS := os.Getenv("ClusterNS")
	if clusterNS == "" {
		missingEnvVars = append(missingEnvVars, "ClusterNS")
	} else {
		ClusterNS = strings.Split(clusterNS, ",")
	}

	checkAndAssignURL("FeishuWebhookURLUFA", &missingEnvVars)
	checkAndAssignURL("FeishuWebhookURLCSD", &missingEnvVars)
	checkAndAssignURL("FeishuWebhookURLOther", &missingEnvVars)
	checkAndAssignURL("FeishuWebhookURLImportant", &missingEnvVars)

	if len(missingEnvVars) > 0 {
		return fmt.Errorf("missing environment variables: %v", missingEnvVars)
	}
	return nil
}

func checkAndAssignURL(key string, missingEnvVars *[]string) {
	url := os.Getenv(key)
	if url == "" {
		*missingEnvVars = append(*missingEnvVars, key)
	} else {
		FeishuWebhookURLMap[key] = url
	}
}
