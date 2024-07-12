package monitor

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/labring/sealos/service/exceptionmonitor/api"
	"github.com/labring/sealos/service/exceptionmonitor/helper/notification"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	metav1unstructured "k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

var (
	databaseClusterGVR = schema.GroupVersionResource{
		Group:    "apps.kubeblocks.io",
		Version:  "v1alpha1",
		Resource: "clusters",
	}
	debtGVR = schema.GroupVersionResource{
		Group:    "account.sealos.io",
		Version:  "v1",
		Resource: "debts",
	}
	debtNamespace = "account-system"
	userGVR       = schema.GroupVersionResource{
		Group:    "user.sealos.io",
		Version:  "v1",
		Resource: "users",
	}
)

func DatabaseExceptionMonitor() {
	for api.DatabaseMonitor {
		if err := checkDatabases(api.ClusterNS); err != nil {
			log.Printf("Failed to check databases: %v", err)
		}
		time.Sleep(5 * time.Minute)
	}
}

func checkDatabases(namespaces []string) error {
	if api.MonitorType == api.MonitorTypeALL {
		if err := checkDatabasesInNamespace(""); err != nil {
			return err
		}
	} else {
		for _, ns := range namespaces {
			if err := checkDatabasesInNamespace(ns); err != nil {
				return err
			}
		}
	}
	return nil
}

func checkDatabasesInNamespace(namespace string) error {
	var clusters *metav1unstructured.UnstructuredList
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
		processCluster(cluster)
	}
	return nil
}

func processCluster(cluster metav1unstructured.Unstructured) {
	databaseClusterName, databaseType, namespace := cluster.GetName(), cluster.GetLabels()[api.DatabaseTypeLabel], cluster.GetNamespace()
	status, _, err := metav1unstructured.NestedString(cluster.Object, "status", "phase")
	if err != nil {
		log.Printf("Unable to get %s status in ns %s: %v", databaseClusterName, namespace, err)
	}
	switch status {
	case api.StatusRunning, api.StatusStopped:
		handleClusterRecovery(databaseClusterName, namespace, status)
	case api.StatusDeleting, api.StatusStopping:
		// No action needed
		break
	case api.StatusUnknown:
		if _, ok := api.LastDatabaseClusterStatus[databaseClusterName]; !ok {
			api.LastDatabaseClusterStatus[databaseClusterName] = status
			api.ExceptionDatabaseMap[databaseClusterName] = true
			alertMessage, feishuWebHook := prepareAlertMessage(databaseClusterName, namespace, status, "", "status is empty", 0)
			if err := sendAlert(alertMessage, feishuWebHook, databaseClusterName); err != nil {
				log.Printf("Failed to send feishu %s in ns %s: %v", databaseClusterName, namespace, err)
			}
		}
	default:
		handleClusterException(databaseClusterName, namespace, databaseType, status)
	}
}

func handleClusterRecovery(databaseClusterName, namespace, status string) {
	if api.ExceptionDatabaseMap[databaseClusterName] {
		notificationInfo := notification.Info{
			DatabaseClusterName: databaseClusterName,
			Namespace:           namespace,
			Status:              status,
			ExceptionType:       "状态",
			NotificationType:    "recovery",
		}
		recoveryMessage := notification.GetNotificationMessage(notificationInfo)
		if err := notification.SendFeishuNotification(recoveryMessage, api.FeishuWebHookMap[databaseClusterName]); err != nil {
			log.Printf("Error sending recovery notification: %v", err)
		}
		cleanClusterStatus(databaseClusterName)
	}
}

func cleanClusterStatus(databaseClusterName string) {
	delete(api.LastDatabaseClusterStatus, databaseClusterName)
	delete(api.DiskFullNamespaceMap, databaseClusterName)
	delete(api.FeishuWebHookMap, databaseClusterName)
	delete(api.ExceptionDatabaseMap, databaseClusterName)
}

func handleClusterException(databaseClusterName, namespace, databaseType, status string) {
	if _, ok := api.LastDatabaseClusterStatus[databaseClusterName]; !ok && !api.DebtNamespaceMap[namespace] {
		api.LastDatabaseClusterStatus[databaseClusterName] = status
		api.ExceptionDatabaseMap[databaseClusterName] = true
		if err := processClusterException(databaseClusterName, namespace, databaseType, status); err != nil {
			log.Printf("Failed to process cluster %s exception in ns %s: %v", databaseClusterName, namespace, err)
		}
	}
	//if !api.DebtNamespaceMap[namespace] && !api.ExceptionDatabaseMap[databaseClusterName] {
	//
	//}
}

func processClusterException(databaseClusterName, namespace, databaseType, status string) error {
	debt, debtLevel, _ := checkDebt(namespace)
	if debt {
		databaseEvents, send := getDatabaseClusterEvents(databaseClusterName, namespace)
		if send {
			maxUsage, err := checkPerformance(namespace, databaseClusterName, databaseType, "disk")
			if err != nil {
				return err
			}

			alertMessage, feishuWebHook := prepareAlertMessage(databaseClusterName, namespace, status, debtLevel, databaseEvents, maxUsage)
			if err := sendAlert(alertMessage, feishuWebHook, databaseClusterName); err != nil {
				return err
			}
		} else {
			if err := notifyQuotaExceeded(databaseClusterName, namespace, status, debtLevel); err != nil {
				return err
			}
		}
	} else {
		api.DebtNamespaceMap[namespace] = true
		delete(api.LastDatabaseClusterStatus, databaseClusterName)
	}
	return nil
}

func getDatabaseClusterEvents(databaseClusterName, namespace string) (string, bool) {
	events, err := api.ClientSet.CoreV1().Events(namespace).List(context.TODO(), metav1.ListOptions{
		FieldSelector: fmt.Sprintf("involvedObject.name=%s", databaseClusterName),
	})
	if err != nil {
		fmt.Printf("Failed get events from databaseCluster: %v\n", err)
		return "", false
	}
	databaseEvents := ""
	for _, event := range events.Items {
		databaseEvents += fmt.Sprintf("%s - %s\n", event.Reason, event.Message)
	}
	send := databaseQuotaExceptionFilter(databaseEvents)
	return databaseEvents, send
}

func databaseQuotaExceptionFilter(databaseEvents string) bool {
	return !strings.Contains(databaseEvents, api.ExceededQuotaException)
}

func prepareAlertMessage(databaseClusterName, namespace, status, debtLevel, databaseEvents string, maxUsage float64) (string, string) {
	alertMessage, feishuWebHook := "", ""
	notificationInfo := notification.Info{
		DatabaseClusterName: databaseClusterName,
		Namespace:           namespace,
		Status:              status,
		DebtLevel:           debtLevel,
		ExceptionType:       "状态",
		Events:              databaseEvents,
		NotificationType:    "exception",
	}
	if maxUsage < api.DatabaseExceptionMonitorThreshold {
		//status == "Creating" || status == "Deleting" || status == "Stopping"
		if status == "Creating" {
			feishuWebHook = api.FeishuWebhookURLMap["FeishuWebhookURLCSD"]
		} else {
			feishuWebHook = api.FeishuWebhookURLMap["FeishuWebhookURLUFA"]
		}
		alertMessage = notification.GetNotificationMessage(notificationInfo)
	} else {
		if !api.DiskFullNamespaceMap[databaseClusterName] {
			feishuWebHook = api.FeishuWebhookURLMap["FeishuWebhookURLOther"]
			notificationInfo.Reason = "disk is full"
			alertMessage = notification.GetNotificationMessage(notificationInfo)
			notification.CreateNotification(namespace, databaseClusterName, status, "disk is full")
		}
		api.DiskFullNamespaceMap[databaseClusterName] = true
	}
	return alertMessage, feishuWebHook
}

func sendAlert(alertMessage, feishuWebHook, databaseClusterName string) error {
	api.FeishuWebHookMap[databaseClusterName] = feishuWebHook
	return notification.SendFeishuNotification(alertMessage, feishuWebHook)
}

func notifyQuotaExceeded(databaseClusterName, namespace, status, debtLevel string) error {
	notificationInfo := notification.Info{
		DatabaseClusterName: databaseClusterName,
		Namespace:           namespace,
		Status:              status,
		DebtLevel:           debtLevel,
		Reason:              api.ExceededQuotaException,
		ExceptionType:       "状态",
		NotificationType:    "exception",
	}
	alertMessage := notification.GetNotificationMessage(notificationInfo)
	notification.CreateNotification(namespace, databaseClusterName, status, api.ExceededQuotaException)
	return notification.SendFeishuNotification(alertMessage, api.FeishuWebhookURLMap["FeishuWebhookURLOther"])
}
