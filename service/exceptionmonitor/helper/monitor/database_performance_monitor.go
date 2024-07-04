package monitor

import (
	"context"
	"log"
	"strconv"
	"time"

	"github.com/labring/sealos/service/exceptionmonitor/api"
	"github.com/labring/sealos/service/exceptionmonitor/helper/notification"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

var numToChinese = []string{"零", "一", "二", "三", "四", "五", "六", "七", "八", "九"}

func DatabasePerformanceMonitor() {
	for {
		if err := checkDatabasePerformance(api.ClusterNS); err != nil {
			log.Printf("Failed to check database performance: %v", err)
		}
		time.Sleep(10 * time.Minute)
	}
}

func checkDatabasePerformance(namespaces []string) error {
	if api.MonitorType == api.MonitorTypeALL {
		if err := checkDatabasePerformanceInNamespace(""); err != nil {
			return err
		}
	} else {
		for _, ns := range namespaces {
			if err := checkDatabasePerformanceInNamespace(ns); err != nil {
				return err
			}
		}
	}
	return nil
}

func checkDatabasePerformanceInNamespace(namespace string) error {
	var clusters *unstructured.UnstructuredList
	var err error
	if api.MonitorType == api.MonitorTypeALL {
		clusters, err = api.DynamicClient.Resource(databaseClusterGVR).List(context.Background(), metav1.ListOptions{})
	} else {
		clusters, err = api.DynamicClient.Resource(databaseClusterGVR).Namespace(namespace).List(context.Background(), metav1.ListOptions{})
	}
	if err != nil {
		return err
	}
	for _, cluster := range clusters.Items {
		monitorCluster(cluster)
	}
	return nil
}

func monitorCluster(cluster unstructured.Unstructured) {
	databaseClusterName, databaseType, namespace, UID := cluster.GetName(), cluster.GetLabels()[api.DatabaseTypeLabel], cluster.GetNamespace(), string(cluster.GetUID())
	status, found, err := unstructured.NestedString(cluster.Object, "status", "phase")
	if err != nil || !found {
		log.Printf("Unable to get %s status in ns %s: %v", databaseClusterName, namespace, err)
	}
	debt, _, _ := checkDebt(namespace)
	if !debt {
		return
	}
	info := notification.Info{
		DatabaseClusterName: databaseClusterName,
		Namespace:           namespace,
		Status:              status,
		NotificationType:    "exception",
		ExceptionType:       "阀值",
	}
	switch status {
	case api.StatusDeleting, api.StatusCreating, api.StatusStopping, api.StatusStopped, api.StatusUnknown:
		break
	default:
		if api.CPUMemMonitor {
			handleCPUMemMonitor(namespace, databaseClusterName, databaseType, UID, info)
		}
		if api.DiskMonitor {
			handleDiskMonitor(namespace, databaseClusterName, databaseType, UID, info)
		}
	}
}

func handleCPUMemMonitor(namespace, databaseClusterName, databaseType, UID string, info notification.Info) {
	if cpuUsage, err := CPUMemMonitor(namespace, databaseClusterName, databaseType, "cpu"); err == nil {
		processUsage(cpuUsage, api.DatabaseCPUMonitorThreshold, "CPU", UID, info, api.CPUMonitorNamespaceMap)
	} else {
		log.Printf("Failed to monitor CPU: %v", err)
	}
	if memUsage, err := CPUMemMonitor(namespace, databaseClusterName, databaseType, "memory"); err == nil {
		processUsage(memUsage, api.DatabaseMemMonitorThreshold, "内存", UID, info, api.MemMonitorNamespaceMap)
	} else {
		log.Printf("Failed to monitor Memory: %v", err)
	}
}

func handleDiskMonitor(namespace, databaseClusterName, databaseType, UID string, info notification.Info) {
	if maxUsage, err := checkPerformance(namespace, databaseClusterName, databaseType, "disk"); err == nil {
		processUsage(maxUsage, api.DatabaseDiskMonitorThreshold, "磁盘", UID, info, api.DiskMonitorNamespaceMap)
	} else {
		log.Printf("Failed to monitor Disk: %v", err)
	}
}

func processUsage(usage float64, threshold float64, performanceType, UID string, info notification.Info, monitorMap map[string]bool) {
	info.PerformanceType = performanceType
	usageStr := strconv.FormatFloat(usage, 'f', 2, 64)
	if performanceType == "CPU" {
		info.CPUUsage = usageStr
	} else if performanceType == "内存" {
		info.MemUsage = usageStr
	} else if performanceType == "磁盘" {
		info.DiskUsage = usageStr
	}
	if usage >= threshold && !monitorMap[UID] {
		alertMessage := notification.GetNotificationMessage(info)
		if err := notification.SendFeishuNotification(alertMessage, api.FeishuWebhookURLMap["FeishuWebhookURLImportant"]); err != nil {
			log.Printf("Failed to send notification: %v", err)
		}
		monitorMap[UID] = true
		if performanceType != "磁盘" {
			return
		}
		ZNThreshold := NumberToChinese(int(threshold))
		if err := notification.SendToSms(info.Namespace, info.DatabaseClusterName, api.ClusterName, "数据库"+performanceType+"超过百分之"+ZNThreshold); err != nil {
			log.Printf("Failed to send Sms: %v", err)
		}
	} else if usage < threshold && monitorMap[UID] {
		info.NotificationType = "recovery"
		alertMessage := notification.GetNotificationMessage(info)
		if err := notification.SendFeishuNotification(alertMessage, api.FeishuWebhookURLMap["FeishuWebhookURLImportant"]); err != nil {
			log.Printf("Failed to send notification: %v", err)
		}
		delete(monitorMap, UID)
	}
}

func CPUMemMonitor(namespace, databaseClusterName, databaseType, checkType string) (float64, error) {
	return checkPerformance(namespace, databaseClusterName, databaseType, checkType)
}

func NumberToChinese(num int) string {
	tenDigit := num / 10
	unitDigit := num % 10

	if tenDigit == 1 && unitDigit == 0 {
		return "十"
	} else if tenDigit == 1 {
		return "十" + numToChinese[unitDigit]
	} else if unitDigit == 0 {
		return numToChinese[tenDigit] + "十"
	} else {
		return numToChinese[tenDigit] + "十" + numToChinese[unitDigit]
	}
}
