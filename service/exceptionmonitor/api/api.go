package api

import (
	"errors"
	"os"
	"strconv"
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

type Info struct {
	DatabaseClusterName string
	Namespace           string
	DebtLevel           string
	DatabaseType        string
	Events              string
	Reason              string
	NotificationType    string
	DiskUsage           string
	CPUUsage            string
	MemUsage            string
	PerformanceType     string
	ExceptionType       string
	ExceptionStatus     string
	RecoveryStatus      string
	ExceptionStatusTime string
	RecoveryTime        string
	DatabaseClusterUID  string
	FeishuWebHook       string
	//struct
	FeishuInfo []map[string]interface{}
}

type NameSpaceQuota struct {
	NameSpace             string
	CPULimit              string
	MemLimit              string
	GPULimit              string
	EphemeralStorageLimit string
	ObjectStorageLimit    string
	NodePortLimit         string
	StorageLimit          string
	CPUUsage              string
	MemUsage              string
	GPUUsage              string
	EphemeralStorageUsage string
	ObjectStorageUsage    string
	NodePortUsage         string
	StorageUsage          string
}

const (
	StatusDeleting = "Deleting"
	StatusCreating = "Creating"
	StatusStopping = "Stopping"
	StatusStopped  = "Stopped"
	StatusRunning  = "Running"
	//StatusUpdating = "Updating"
	StatusUnknown  = ""
	MonitorTypeALL = "all"
	DiskChinese    = "磁盘"
	MemoryChinese  = "内存"
	CPUChinese     = "CPU"
)

var (
	ClientSet                         *kubernetes.Clientset
	DynamicClient                     *dynamic.DynamicClient
	DebtNamespaceMap                  = make(map[string]bool)
	DiskFullNamespaceMap              = make(map[string]bool)
	CPUNotificationInfoMap            = make(map[string]*Info)
	MemNotificationInfoMap            = make(map[string]*Info)
	DiskNotificationInfoMap           = make(map[string]*Info)
	LastBackupStatusMap               = make(map[string]string)
	IsSendBackupStatusMap             = make(map[string]string)
	DatabaseNotificationInfoMap       = make(map[string]*Info)
	ExceededQuotaException            = "exceeded quota"
	DiskException                     = "Writing to log file failed"
	OwnerLabel                        = "user.sealos.io/owner"
	DatabaseTypeLabel                 = "clusterdefinition.kubeblocks.io/name"
	ClusterName                       string
	MonitorType                       string
	ClusterNS                         []string
	FeishuWebhookURLMap               = make(map[string]string)
	ClusterRegionMap                  = make(map[string]string)
	BaseURL                           string
	LOCALREGION                       string
	DatabaseMonitor                   bool
	DiskMonitor                       bool
	CPUMemMonitor                     bool
	BackupMonitor                     bool
	QuotaMonitor                      bool
	CockroachMonitor                  bool
	DatabaseDiskMonitorThreshold      float64
	DatabaseExceptionMonitorThreshold float64
	DatabaseCPUMonitorThreshold       float64
	DatabaseMemMonitorThreshold       float64
	QuotaThreshold                    float64
	APPID                             string
	APPSECRET                         string
	GlobalCockroachURI                string
	LocalCockroachURI                 string
	DatabaseStatusMessageIDMap        = make(map[string]string)
	DatabaseDiskMessageIDMap          = make(map[string]string)
	DatabaseCPUMessageIDMap           = make(map[string]string)
	DatabaseMemMessageIDMap           = make(map[string]string)
	DatabaseBackupMessageIDMap        = make(map[string]string)
	QuotaMessageIDMap                 = make(map[string]string)
)

func GetENV() error {
	var missingEnvVars []string

	APPID = getEnvWithCheck("APPID", &missingEnvVars)
	APPSECRET = getEnvWithCheck("APPSECRET", &missingEnvVars)
	BaseURL = getEnvWithCheck("BaseURL", &missingEnvVars)
	ClusterName = getEnvWithCheck("ClusterName", &missingEnvVars)
	MonitorType = getEnvWithCheck("MonitorType", &missingEnvVars)
	clusterNS := getEnvWithCheck("ClusterNS", &missingEnvVars)
	LOCALREGION = getEnvWithCheck("LOCALREGION", &missingEnvVars)
	GlobalCockroachURI = getEnvWithCheck("GlobalCockroachURI", &missingEnvVars)
	LocalCockroachURI = getEnvWithCheck("LocalCockroachURI", &missingEnvVars)
	DatabaseMonitor, _ = strconv.ParseBool(getEnvWithCheck("DatabaseMonitor", &missingEnvVars))
	DiskMonitor, _ = strconv.ParseBool(getEnvWithCheck("DiskMonitor", &missingEnvVars))
	CPUMemMonitor, _ = strconv.ParseBool(getEnvWithCheck("CPUMemMonitor", &missingEnvVars))
	BackupMonitor, _ = strconv.ParseBool(getEnvWithCheck("BackupMonitor", &missingEnvVars))
	QuotaMonitor, _ = strconv.ParseBool(getEnvWithCheck("QuotaMonitor", &missingEnvVars))
	CockroachMonitor, _ = strconv.ParseBool(getEnvWithCheck("CockroachMonitor", &missingEnvVars))
	DatabaseDiskMonitorThreshold, _ = strconv.ParseFloat(getEnvWithCheck("DatabaseDiskMonitorThreshold", &missingEnvVars), 64)
	DatabaseExceptionMonitorThreshold, _ = strconv.ParseFloat(getEnvWithCheck("DatabaseExceptionMonitorThreshold", &missingEnvVars), 64)
	DatabaseCPUMonitorThreshold, _ = strconv.ParseFloat(getEnvWithCheck("DatabaseCPUMonitorThreshold", &missingEnvVars), 64)
	DatabaseMemMonitorThreshold, _ = strconv.ParseFloat(getEnvWithCheck("DatabaseMemMonitorThreshold", &missingEnvVars), 64)
	QuotaThreshold, _ = strconv.ParseFloat(getEnvWithCheck("QuotaThreshold", &missingEnvVars), 64)

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
		//Backup
		"FeishuWebhookURLBackup",
		//Quota
		"FeishuWebhookURLQuota",
		//CockroachDB
		"FeishuWebhookURLCockroachDB",
	}, FeishuWebhookURLMap, &missingEnvVars)

	// Get ClusterRegionMap
	getEnvMapWithCheck([]string{
		"io",
		"bja",
		"hzh",
		"gzg",
		"top",
	}, ClusterRegionMap, &missingEnvVars)

	if len(missingEnvVars) > 0 {
		return errors.New("missing environment variables")
	}
	return nil
}

func getEnvWithCheck(key string, missingEnvVars *[]string) string {
	value := os.Getenv(key)
	if value == "" {
		if MonitorType == MonitorTypeALL && key == "ClusterNS" {
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
