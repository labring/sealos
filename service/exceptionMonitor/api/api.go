package api

import (
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"os"
	"strings"
)

const (
	//Updating、Failed、Abnormal
	FeishuWebhookURL1 = "https://open.feishu.cn/open-apis/bot/v2/hook/39260980-fbea-4c1a-9f72-f75c372c1b73"
	//Creating、Stopping、Deleteting
	FeishuWebhookURL2 = "https://open.feishu.cn/open-apis/bot/v2/hook/53c80da2-74e4-4e90-9a82-57ff04c5c301"
	//exceeded quota、disk is full
	FeishuWebhookURL3 = "https://open.feishu.cn/open-apis/bot/v2/hook/0095147f-b8ad-40d0-a6a1-79af0bcbd7b3"
	//important cluster ns
	FeishuWebhookURL4 = "https://open.feishu.cn/open-apis/bot/v2/hook/31d9ca94-bae3-43d1-b858-06bb7955217b"
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
)

func GetClusterNameFromEnv() string {
	return os.Getenv("ClusterName")
}

func GetMonitorTypeFromEnv() string {
	return os.Getenv("MonitorType")
}

func GetClusterNSFromEnv() []string {
	clusterNS := os.Getenv("ClusterNS")
	return strings.Split(clusterNS, ",")
}
