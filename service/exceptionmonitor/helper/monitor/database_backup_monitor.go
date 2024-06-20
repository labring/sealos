package monitor

import (
	"context"
	"fmt"
	"strings"

	"github.com/labring/sealos/service/exceptionmonitor/api"
	"github.com/labring/sealos/service/exceptionmonitor/helper/notification"
	"k8s.io/apimachinery/pkg/runtime/schema"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

var (
	backupGVR = schema.GroupVersionResource{
		Group:    "dataprotection.kubeblocks.io",
		Version:  "v1alpha1",
		Resource: "backups",
	}
)

func CheckDatabaseBackup() error {
	backupList, err := api.DynamicClient.Resource(backupGVR).List(context.Background(), metav1.ListOptions{})
	if err != nil {
		return err
	}
	for _, backup := range backupList.Items {
		status, found, err := unstructured.NestedString(backup.Object, "status", "phase")
		backupName, namespace, startTime := backup.GetName(), backup.GetNamespace(), backup.GetCreationTimestamp().String()
		if err != nil || !found {
			fmt.Printf("Unable to get %s status in ns %s: %v\n", backupName, namespace, err)
			continue
		}
		backupPolicyName, found, err := unstructured.NestedString(backup.Object, "spec", "backupPolicyName")
		if err != nil || !found {
			fmt.Printf("Unable to get %s backupPolicyName in ns %s: %v\n", backupName, namespace, err)
			continue
		}
		if status == "Completed" {
			//备份恢复告警
			if _, ok := api.LastBackupStatusMap[backupName]; ok {
				message := notification.GetBackupMessage("recovery", namespace, backupName, status, startTime, "")
				err = notification.SendFeishuNotification(message, api.FeishuWebhookURLMap["FeishuWebhookURLBackup"])
				if err != nil {
					fmt.Printf("Error sending recovery notification: %v\n", err)
				}
				delete(api.LastBackupStatusMap, backupName)
				delete(api.IsSendBackupStatusMap, backupName)
			}
			continue
		}
		if status != "Failed" {
			continue
		}
		if _, ok := api.LastBackupStatusMap[backupName]; !ok {
			api.LastBackupStatusMap[backupName] = status
			continue
		}
		if _, ok := api.IsSendBackupStatusMap[backupName]; ok {
			continue
		}

		if ok, _ := checkFailedBackup(backupPolicyName, namespace); ok {
			message := notification.GetBackupMessage("exception", namespace, backupName, status, startTime, "")
			err = notification.SendFeishuNotification(message, api.FeishuWebhookURLMap["FeishuWebhookURLBackup"])
			if err != nil {
				fmt.Printf("Error sending recovery notification: %v\n", err)
			}
			continue
		}
		err = api.DynamicClient.Resource(backupGVR).Namespace(namespace).Delete(context.TODO(), backupName, metav1.DeleteOptions{})
		if err != nil {
			fmt.Printf("Failed to delete %s in ns %s: %v\n", backupName, namespace, err)
		}
	}
	return nil
}

func checkFailedBackup(backupPolicyName, namespace string) (bool, error) {
	databaseName := getPrefix(backupPolicyName)
	podList, err := api.ClientSet.CoreV1().Pods(namespace).List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return false, err
	}
	for _, pod := range podList.Items {
		if podName := pod.GetName(); strings.HasPrefix(podName, databaseName) {
			return true, nil
		}
	}
	return false, err
}

func getPrefix(backupPolicyName string) string {
	parts := strings.Split(backupPolicyName, "-")
	if len(parts) < 3 {
		return ""
	}
	return strings.Join(parts[:len(parts)-2], "-")
}
