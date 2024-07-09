package monitor

import (
	"context"
	"log"
	"time"

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
		time.Sleep(1 * time.Hour)
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
	backupName, namespace, startTime := backup.GetName(), backup.GetNamespace(), backup.GetCreationTimestamp().String()
	if err != nil {
		log.Printf("Unable to get %s status in ns %s:%v", backupName, namespace, err)
		return
	}
	if !found || status != "Failed" {
		return
	}
	if _, ok := api.LastBackupStatusMap[backupName]; !ok {
		message := notification.GetBackupMessage("exception", namespace, backupName, status, startTime, "")
		if err := notification.SendFeishuNotification(message, api.FeishuWebhookURLMap["FeishuWebhookURLBackup"]); err != nil {
			log.Printf("Error sending exception notification:%v", err)
		}
	} else {
		api.LastBackupStatusMap[backupName] = status
	}
	//backupPolicyName, found, err := unstructured.NestedString(backup.Object, "spec", "backupPolicyName")
	//if err != nil || !found {
	//	log.Printf("Unable to get %s backupPolicyName in ns %s:%v", backupName, namespace, err)
	//	return
	//}
	//handleBackupStatus(backupName, namespace, status, startTime, backupPolicyName)
}

//func handleBackupStatus(backupName, namespace, status, startTime, backupPolicyName string) {
//	//if status == "Completed" {
//	//	handleBackupCompletion(backupName, namespace, status, startTime)
//	//	return
//	//}
//	//if CheckackupFailure(backupName, namespace, status, backupPolicyName) {
//	//	err := api.DynamicClient.Resource(backupGVR).Namespace(namespace).Delete(context.Background(), backupName, metav1.DeleteOptions{})
//	//	if err != nil {
//	//		log.Printf("Failed to delete%s in ns %s:%v", backupName, namespace, err)
//	//	}
//	//}
//
//}

//func handleBackupCompletion(backupName, namespace, status, startTime string) {
//	if _, ok := api.LastBackupStatusMap[backupName]; ok {
//		message := notification.GetBackupMessage("recovery", namespace, backupName, status, startTime, "")
//		if err := notification.SendFeishuNotification(message, api.FeishuWebhookURLMap["FeishuWebhookURLBackup"]); err != nil {
//			log.Printf("Error sending recovery notification:%v", err)
//		}
//		delete(api.LastBackupStatusMap, backupName)
//		delete(api.IsSendBackupStatusMap, backupName)
//	}
//}
//
//func CheckackupFailure(backupName, namespace, status, backupPolicyName string) bool {
//	if _, ok := api.LastBackupStatusMap[backupName]; !ok {
//		api.LastBackupStatusMap[backupName] = status
//		return false
//	}
//	if _, ok := api.IsSendBackupStatusMap[backupName]; ok {
//		return false
//	}
//
//	if ok, _ := checkFailedBackup(backupPolicyName, namespace); ok {
//		message := notification.GetBackupMessage("exception", namespace, backupName, "Failed", "", "")
//		if err := notification.SendFeishuNotification(message, api.FeishuWebhookURLMap["FeishuWebhookURLBackup"]); err != nil {
//			log.Printf("Error sending exception notification:%v", err)
//		}
//		return true
//	}
//	return false
//}
//
//func checkFailedBackup(backupPolicyName, namespace string) (bool, error) {
//	databaseName := getPrefix(backupPolicyName)
//	podList, err := api.ClientSet.CoreV1().Pods(namespace).List(context.Background(), metav1.ListOptions{})
//	if err != nil {
//		return false, err
//	}
//	for _, pod := range podList.Items {
//		if strings.HasPrefix(pod.GetName(), databaseName) {
//			return true, nil
//		}
//	}
//	return false, nil
//}
//
//func getPrefix(backupPolicyName string) string {
//	parts := strings.Split(backupPolicyName, "-")
//	if len(parts) < 3 {
//		return ""
//	}
//	return strings.Join(parts[:len(parts)-2], "-")
//}
