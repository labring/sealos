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
	notificationInfo := api.Info{}
	getClusterDatabaseInfo(cluster, &notificationInfo)
	debt, _, _ := checkDebt(notificationInfo.Namespace)
	if !debt {
		return
	}
	notificationInfo.ExceptionType = "阀值"
	if value, ok := api.CPUNotificationInfoMap[notificationInfo.DatabaseClusterUID]; ok {
		notificationInfo = *value
	} else if value, ok := api.MemNotificationInfoMap[notificationInfo.DatabaseClusterUID]; ok {
		notificationInfo = *value
	} else if value, ok := api.DiskNotificationInfoMap[notificationInfo.DatabaseClusterUID]; ok {
		notificationInfo = *value
	}
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
	if cpuUsage, err := CPUMemMonitor(notificationInfo, "cpu"); err == nil {
		processUsage(cpuUsage, api.DatabaseCPUMonitorThreshold, api.CPUChinese, notificationInfo)
	} else {
		log.Printf("Failed to monitor CPU: %v", err)
	}
	if memUsage, err := CPUMemMonitor(notificationInfo, "memory"); err == nil {
		processUsage(memUsage, api.DatabaseMemMonitorThreshold, api.MemoryChinese, notificationInfo)
	} else {
		log.Printf("Failed to monitor Memory: %v", err)
	}
}

func handleDiskMonitor(notificationInfo *api.Info) {
	if maxUsage, err := checkPerformance(notificationInfo, "disk"); err == nil {
		processUsage(maxUsage, api.DatabaseDiskMonitorThreshold, api.DiskChinese, notificationInfo)
	} else {
		log.Printf("Failed to monitor Disk: %v", err)
	}
}

func processUsage(usage float64, threshold float64, performanceType string, notificationInfo *api.Info) {
	notificationInfo.PerformanceType = performanceType
	usageStr := strconv.FormatFloat(usage, 'f', 2, 64)
	if notificationInfo.PerformanceType == api.CPUChinese {
		notificationInfo.CPUUsage = usageStr
	} else if performanceType == api.MemoryChinese {
		notificationInfo.MemUsage = usageStr
	} else if performanceType == api.DiskChinese {
		notificationInfo.DiskUsage = usageStr
	}
	if usage >= threshold {
		if _, ok := api.CPUNotificationInfoMap[notificationInfo.DatabaseClusterUID]; !ok && notificationInfo.PerformanceType == api.CPUChinese {
			processException(notificationInfo, threshold)
		}
		if _, ok := api.MemNotificationInfoMap[notificationInfo.DatabaseClusterUID]; !ok && notificationInfo.PerformanceType == api.MemoryChinese {
			processException(notificationInfo, threshold)
		}
		if _, ok := api.DiskNotificationInfoMap[notificationInfo.DatabaseClusterUID]; !ok && notificationInfo.PerformanceType == api.DiskChinese {
			processException(notificationInfo, threshold)
		}
	} else if usage < threshold {
		if _, ok := api.CPUNotificationInfoMap[notificationInfo.DatabaseClusterUID]; ok && notificationInfo.PerformanceType == api.CPUChinese {
			processRecovery(notificationInfo)
		}
		if _, ok := api.MemNotificationInfoMap[notificationInfo.DatabaseClusterUID]; ok && notificationInfo.PerformanceType == api.MemoryChinese {
			processRecovery(notificationInfo)
		}
		if _, ok := api.DiskNotificationInfoMap[notificationInfo.DatabaseClusterUID]; ok && notificationInfo.PerformanceType == api.DiskChinese {
			processRecovery(notificationInfo)
		}
	}
}

func processException(notificationInfo *api.Info, threshold float64) {
	notificationInfo.NotificationType = notification.ExceptionType
	alertMessage := notification.GetNotificationMessage(notificationInfo)
	notificationInfo.FeishuWebHook = api.FeishuWebhookURLMap["FeishuWebhookURLImportant"]
	if err := notification.SendFeishuNotification(notificationInfo, alertMessage); err != nil {
		log.Printf("Failed to send notification: %v", err)
	}
	if notificationInfo.PerformanceType == api.CPUChinese {
		api.CPUNotificationInfoMap[notificationInfo.DatabaseClusterUID] = notificationInfo
		return
	}
	if notificationInfo.PerformanceType == api.MemoryChinese {
		api.MemNotificationInfoMap[notificationInfo.DatabaseClusterUID] = notificationInfo
		return
	}
	if notificationInfo.PerformanceType == api.DiskChinese {
		api.DiskNotificationInfoMap[notificationInfo.DatabaseClusterUID] = notificationInfo
	}
	ZNThreshold := NumberToChinese(int(threshold))
	if err := notification.SendToSms(notificationInfo, api.ClusterName, "数据库"+notificationInfo.PerformanceType+"超过百分之"+ZNThreshold); err != nil {
		log.Printf("Failed to send Sms: %v", err)
	}
}

func processRecovery(notificationInfo *api.Info) {
	notificationInfo.NotificationType = "recovery"
	notificationInfo.RecoveryStatus = notificationInfo.ExceptionStatus
	notificationInfo.RecoveryTime = time.Now().Add(8 * time.Hour).Format("2006-01-02 15:04:05")
	alertMessage := notification.GetNotificationMessage(notificationInfo)
	notificationInfo.FeishuWebHook = api.FeishuWebhookURLMap["FeishuWebhookURLImportant"]
	if err := notification.SendFeishuNotification(notificationInfo, alertMessage); err != nil {
		log.Printf("Failed to send notification: %v", err)
	}
	if notificationInfo.PerformanceType == api.CPUChinese {
		delete(api.CPUNotificationInfoMap, notificationInfo.DatabaseClusterUID)
	}
	if notificationInfo.PerformanceType == api.MemoryChinese {
		delete(api.MemNotificationInfoMap, notificationInfo.DatabaseClusterUID)
	}
	if notificationInfo.PerformanceType == api.DiskChinese {
		delete(api.DiskNotificationInfoMap, notificationInfo.DatabaseClusterUID)
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
	}
	return numToChinese[tenDigit] + "十" + numToChinese[unitDigit]
}
