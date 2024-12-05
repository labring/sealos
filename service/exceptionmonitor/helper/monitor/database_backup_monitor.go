package monitor

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"k8s.io/apimachinery/pkg/api/errors"

	"github.com/labring/sealos/service/exceptionmonitor/api"
	"github.com/labring/sealos/service/exceptionmonitor/helper/notification"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

var (
	backupGVR = schema.GroupVersionResource{
		Group:    "dataprotection.kubeblocks.io",
		Version:  "v1alpha1",
		Resource: "backups",
	}
)

func DatabaseBackupMonitor() {
	for api.BackupMonitor {
		if err := checkDatabaseBackups(); err != nil {
			log.Printf("Failed to check database backups: %v", err)
		}
		time.Sleep(1 * time.Minute)
	}
}

func checkDatabaseBackups() error {
	backupList, err := api.DynamicClient.Resource(backupGVR).List(context.Background(), metav1.ListOptions{})
	if err != nil {
		return err
	}
	for _, backup := range backupList.Items {
		processBackup(backup)
	}
	return nil
}

func processBackup(backup unstructured.Unstructured) {
	status, found, err := unstructured.NestedString(backup.Object, "status", "phase")
	backupName, namespace, startTimestamp := backup.GetName(), backup.GetNamespace(), backup.GetCreationTimestamp().String()
	if err != nil {
		log.Printf("Unable to get %s status in %s:%v", backupName, namespace, err)
		return
	}
	if !found || (status != "Failed" && status != "InProgress") {
		return
	}
	if status == "InProgress" {
		startTime, err := time.Parse(time.RFC3339, startTimestamp)
		if err != nil {
			log.Printf("%s Unable to parsing time  in %s:%v", backupName, namespace, err)
			fmt.Println("Error parsing time:", err)
			return
		}
		currentTime := time.Now().UTC()
		duration := currentTime.Sub(startTime)
		if duration >= time.Hour {
			SendBackupNotification(backupName, namespace, status, startTimestamp)
		}
		return
	}
	debt, _, _ := checkDebt(namespace)
	if !debt {
		return
	}
	backupPolicyName, _, _ := unstructured.NestedString(backup.Object, "spec", "backupPolicyName")
	databaseName := getPrefix(backupPolicyName)
	cluster, err := api.DynamicClient.Resource(databaseClusterGVR).Namespace(namespace).Get(context.Background(), databaseName, metav1.GetOptions{})
	if cluster == nil && errors.IsNotFound(err) {
		return
	}
	dbStatus, found, err := unstructured.NestedString(cluster.Object, "status", "phase")
	if err != nil {
		log.Printf("Unable to get %s phase in %s: %v", backupName, namespace, err)
		return
	}
	if !found || dbStatus == "Stopped" {
		return
	}
	SendBackupNotification(backupName, namespace, status, startTimestamp)
}

func SendBackupNotification(backupName, namespace, status, startTimestamp string) {
	notificationInfo := api.Info{
		DatabaseClusterName: backupName,
		Namespace:           namespace,
		ExceptionStatus:     status,
		ExceptionType:       "备份",
		PerformanceType:     "Backup",
		NotificationType:    notification.ExceptionType,
		FeishuWebHook:       api.FeishuWebhookURLMap["FeishuWebhookURLBackup"],
	}
	if _, ok := api.LastBackupStatusMap[backupName]; !ok {
		message := notification.GetBackupMessage(notification.ExceptionType, namespace, backupName, status, startTimestamp, "")
		if err := notification.SendFeishuNotification(&notificationInfo, message); err != nil {
			log.Printf("Error sending exception notification:%v", err)
		}
		api.LastBackupStatusMap[backupName] = status
	}
}

func getPrefix(backupPolicyName string) string {
	parts := strings.Split(backupPolicyName, "-")
	if len(parts) < 3 {
		return ""
	}
	return strings.Join(parts[:len(parts)-3], "-")
}
