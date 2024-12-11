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
		time.Sleep(1 * time.Minute)
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
	notificationInfo := api.Info{}
	getClusterDatabaseInfo(cluster, &notificationInfo)
	//notificationInfo.DatabaseClusterName, notificationInfo.DatabaseType, notificationInfo.Namespace, notificationInfo.DatabaseClusterUID = cluster.GetName(), cluster.GetLabels()[api.DatabaseTypeLabel], cluster.GetNamespace(), string(cluster.GetUID())
	//status, found, err := unstructured.NestedString(cluster.Object, "status", "phase")
	//if err != nil || !found {
	//	log.Printf("Unable to get %s status in ns %s: %v", notificationInfo.DatabaseClusterName, notificationInfo.Namespace, err)
	//}
	debt, _, _ := checkDebt(notificationInfo.Namespace)
	if !debt {
		return
	}
	notificationInfo.NotificationType = notification.ExceptionType
	notificationInfo.ExceptionType = "阀值"
	switch notificationInfo.ExceptionStatus {
	case api.StatusDeleting, api.StatusCreating, api.StatusStopping, api.StatusStopped, api.StatusUnknown:
		break
	default:
		if api.CPUMemMonitor {
			handleCPUMemMonitor(&notificationInfo)
		}
		if api.DiskMonitor {
			handleDiskMonitor(&notificationInfo)
		}
	}
}

func handleCPUMemMonitor(notificationInfo *api.Info) {
	if cpuUsage, err := CPUMemMonitor(notificationInfo, api.CPUChinese); err == nil {
		processUsage(cpuUsage, api.DatabaseCPUMonitorThreshold, api.CPUChinese, notificationInfo, api.CPUMonitorNamespaceMap)
	} else {
		log.Printf("Failed to monitor CPU: %v", err)
	}
	if memUsage, err := CPUMemMonitor(notificationInfo, "memory"); err == nil {
		processUsage(memUsage, api.DatabaseMemMonitorThreshold, api.MemoryChinese, notificationInfo, api.MemMonitorNamespaceMap)
	} else {
		log.Printf("Failed to monitor Memory: %v", err)
	}
}

func handleDiskMonitor(notificationInfo *api.Info) {
	if maxUsage, err := checkPerformance(notificationInfo, "disk"); err == nil {
		processUsage(maxUsage, api.DatabaseDiskMonitorThreshold, api.DiskChinese, notificationInfo, api.DiskMonitorNamespaceMap)
	} else {
		log.Printf("Failed to monitor Disk: %v", err)
	}
}

func processUsage(usage float64, threshold float64, performanceType string, notificationInfo *api.Info, monitorMap map[string]bool) {
	notificationInfo.PerformanceType = performanceType
	usageStr := strconv.FormatFloat(usage, 'f', 2, 64)
	if performanceType == api.CPUChinese {
		notificationInfo.CPUUsage = usageStr
	} else if performanceType == api.MemoryChinese {
		notificationInfo.MemUsage = usageStr
	} else if performanceType == api.DiskChinese {
		notificationInfo.DiskUsage = usageStr
	}
	if usage >= threshold && !monitorMap[notificationInfo.DatabaseClusterUID] {
		notificationInfo.NotificationType = "exception"
		alertMessage := notification.GetNotificationMessage(notificationInfo)
		notificationInfo.FeishuWebHook = api.FeishuWebhookURLMap["FeishuWebhookURLImportant"]
		if err := notification.SendFeishuNotification(notificationInfo, alertMessage); err != nil {
			log.Printf("Failed to send notification: %v", err)
		}
		monitorMap[notificationInfo.DatabaseClusterUID] = true
		if performanceType != api.DiskChinese {
			return
		}
		ZNThreshold := NumberToChinese(int(threshold))
		if err := notification.SendToSms(notificationInfo, api.ClusterName, "数据库"+performanceType+"超过百分之"+ZNThreshold); err != nil {
			log.Printf("Failed to send Sms: %v", err)
		}
	} else if usage < threshold && monitorMap[notificationInfo.DatabaseClusterUID] {
		notificationInfo.NotificationType = "recovery"
		notificationInfo.RecoveryStatus = notificationInfo.ExceptionStatus
		notificationInfo.RecoveryTime = time.Now().Add(8 * time.Hour).Format("2006-01-02 15:04:05")
		alertMessage := notification.GetNotificationMessage(notificationInfo)
		notificationInfo.FeishuWebHook = api.FeishuWebhookURLMap["FeishuWebhookURLImportant"]
		if err := notification.SendFeishuNotification(notificationInfo, alertMessage); err != nil {
			log.Printf("Failed to send notification: %v", err)
		}
		delete(monitorMap, notificationInfo.DatabaseClusterUID)
	}
}

func CPUMemMonitor(notificationInfo *api.Info, checkType string) (float64, error) {
	return checkPerformance(notificationInfo, checkType)
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
