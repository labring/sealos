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

const (
	StatusDeleting = "Deleting"
	StatusCreating = "Creating"
	StatusStopping = "Stopping"
	StatusStopped  = "Stopped"
	StatusRunning  = "Running"
	StatusUpdating = "Updating"
	StatusUnknown  = ""
	MonitorTypeALL = "all"
)

var (
	ClientSet     *kubernetes.Clientset
	DynamicClient *dynamic.DynamicClient
	// records the last database status
	LastDatabaseClusterStatus = make(map[string]string)
	// record the debt ns
	ExceptionDatabaseMap              = make(map[string]bool)
	FeishuWebHookMap                  = make(map[string]string)
	DebtNamespaceMap                  = make(map[string]bool)
	DiskFullNamespaceMap              = make(map[string]bool)
	DiskMonitorNamespaceMap           = make(map[string]bool)
	CPUMonitorNamespaceMap            = make(map[string]bool)
	MemMonitorNamespaceMap            = make(map[string]bool)
	LastBackupStatusMap               = make(map[string]string)
	IsSendBackupStatusMap             = make(map[string]string)
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
	DatabaseDiskMonitorThreshold      float64
	DatabaseExceptionMonitorThreshold float64
	DatabaseCPUMonitorThreshold       float64
	DatabaseMemMonitorThreshold       float64
)

func GetENV() error {
	var missingEnvVars []string

	BaseURL = getEnvWithCheck("BaseURL", &missingEnvVars)
	ClusterName = getEnvWithCheck("ClusterName", &missingEnvVars)
	MonitorType = getEnvWithCheck("MonitorType", &missingEnvVars)
	clusterNS := getEnvWithCheck("ClusterNS", &missingEnvVars)
	LOCALREGION = getEnvWithCheck("LOCALREGION", &missingEnvVars)
	DatabaseMonitor, _ = strconv.ParseBool(getEnvWithCheck("DatabaseMonitor", &missingEnvVars))
	DiskMonitor, _ = strconv.ParseBool(getEnvWithCheck("DiskMonitor", &missingEnvVars))
	CPUMemMonitor, _ = strconv.ParseBool(getEnvWithCheck("CPUMemMonitor", &missingEnvVars))
	BackupMonitor, _ = strconv.ParseBool(getEnvWithCheck("BackupMonitor", &missingEnvVars))
	DatabaseDiskMonitorThreshold, _ = strconv.ParseFloat(getEnvWithCheck("DatabaseDiskMonitorThreshold", &missingEnvVars), 64)
	DatabaseExceptionMonitorThreshold, _ = strconv.ParseFloat(getEnvWithCheck("DatabaseExceptionMonitorThreshold", &missingEnvVars), 64)
	DatabaseCPUMonitorThreshold, _ = strconv.ParseFloat(getEnvWithCheck("DatabaseCPUMonitorThreshold", &missingEnvVars), 64)
	DatabaseMemMonitorThreshold, _ = strconv.ParseFloat(getEnvWithCheck("DatabaseMemMonitorThreshold", &missingEnvVars), 64)

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
