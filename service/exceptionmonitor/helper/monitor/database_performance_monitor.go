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

func DatabasePerformanceMonitor() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		if err := checkDatabasePerformance(); err != nil {
			log.Fatalf("Failed to check database performance: %v", err)
		}
	}
}

func checkDatabasePerformance() error {
	clusters, err := api.DynamicClient.Resource(databaseClusterGVR).List(context.Background(), metav1.ListOptions{})
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
		return
	}
	info := notification.NotificationInfo{
		DatabaseClusterName: databaseClusterName,
		Namespace:           namespace,
		Status:              status,
		NotificationType:    "exception",
		ExceptionType:       "performance",
	}
	if api.CPUMemMonitor {
		handleCPUMemMonitor(namespace, databaseClusterName, databaseType, UID, info)
	}
	if api.DiskMonitor {
		handleDiskMonitor(namespace, databaseClusterName, status, databaseType, UID)
	}
}

func handleCPUMemMonitor(namespace, databaseClusterName, databaseType, UID string, info notification.NotificationInfo) {
	if cpuUsage, err := CPUMemMonitor(namespace, databaseClusterName, databaseType, "cpu"); err == nil {
		usageStr := strconv.FormatFloat(cpuUsage, 'f', 2, 64)
		info.CPUUsage = usageStr
		processUsage(cpuUsage, databaseCPUMemMonitorThreshold, "CPU", UID, info, api.CPUMonitorNamespaceMap)
	} else {
		log.Printf("Failed to monitor CPU: %v", err)
	}

	if memUsage, err := CPUMemMonitor(namespace, databaseClusterName, databaseType, "memory"); err == nil {
		usageStr := strconv.FormatFloat(memUsage, 'f', 2, 64)
		info.CPUUsage = usageStr
		processUsage(memUsage, databaseCPUMemMonitorThreshold, "内存", UID, info, api.MemMonitorNamespaceMap)
	} else {
		log.Printf("Failed to monitor Memory: %v", err)
	}
}

func handleDiskMonitor(namespace, databaseClusterName, status, databaseType, UID string) {
	info := notification.NotificationInfo{
		DatabaseClusterName: databaseClusterName,
		Namespace:           namespace,
		Status:              status,
		NotificationType:    "exception",
		ExceptionType:       "performance",
	}
	if maxUsage, err := checkPerformance(namespace, databaseClusterName, databaseType, "disk"); err == nil {
		usageStr := strconv.FormatFloat(maxUsage, 'f', 2, 64)
		info.CPUUsage = usageStr
		processUsage(maxUsage, databaseDiskMonitorThreshold, "磁盘", UID, info, api.DiskMonitorNamespaceMap)
	} else {
		log.Printf("Failed to monitor Disk: %v", err)
	}
}

func processUsage(usage float64, threshold float64, performanceType, UID string, info notification.NotificationInfo, monitorMap map[string]bool) {
	info.PerformanceType = performanceType
	if usage >= threshold {
		if !monitorMap[UID] {
			alertMessage := notification.GetNotificationMessage(info)
			if err := notification.SendFeishuNotification(alertMessage, api.FeishuWebhookURLMap["FeishuWebhookURLImportant"]); err != nil {
				log.Printf("Failed to send notification: %v", err)
			}
			monitorMap[UID] = true
		}
	} else {
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
