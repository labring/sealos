package monitor

import (
	"context"
	"exceptionMonitor/api"
	"exceptionMonitor/helper/notification"
	"fmt"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"strings"
)

var (
	databaseClusterGVR = schema.GroupVersionResource{
		Group:    "apps.kubeblocks.io",
		Version:  "v1alpha1",
		Resource: "clusters",
	}
	debtResourceQuota = "debt-limit0"
	debtNamespace     = "account-system"
	debtGVR           = schema.GroupVersionResource{
		Group:    "account.sealos.io",
		Version:  "v1",
		Resource: "debts",
	}
	userGVR = schema.GroupVersionResource{
		Group:    "user.sealos.io",
		Version:  "v1",
		Resource: "users",
	}
)

func CheckDatabases(ns string) error {
	var clusters *unstructured.UnstructuredList
	var err error
	if api.MonitorType == "all" {
		clusters, err = api.DynamicClient.Resource(databaseClusterGVR).List(context.Background(), metav1.ListOptions{})
	} else {
		clusters, err = api.DynamicClient.Resource(databaseClusterGVR).Namespace(ns).List(context.Background(), metav1.ListOptions{})
	}
	if err != nil {
		return err
	}
	for _, cluster := range clusters.Items {
		//Avoid duplicate sending notifacation
		isSend := false
		databaseClusterName, databaseType, namespace := cluster.GetName(), cluster.GetLabels()[api.DatabaseTypeLabel], cluster.GetNamespace()
		status, found, err := unstructured.NestedString(cluster.Object, "status", "phase")
		if err != nil || !found {
			fmt.Printf("Unable to get %s status in ns %s: %v\n", databaseClusterName, namespace, err)
			continue
		}
		if status == "Running" || status == "Stopped" {
			//database recovery notification
			if api.ExceptionDatabaseMap[databaseClusterName] {
				recoveryMessage := notification.GetNotificationMessage(databaseClusterName, namespace, status, "", "", "")
				err = notification.SendFeishuNotification(recoveryMessage, api.FeishuWebHookMap[databaseClusterName])
				if err != nil {
					fmt.Printf("Error sending recovery notification: %v\n", err)
				}
				delete(api.LastDatabaseClusterStatus, databaseClusterName)
				delete(api.DiskFullNamespaceMap, databaseClusterName)
				delete(api.FeishuWebHookMap, databaseClusterName)
				delete(api.ExceptionDatabaseMap, databaseClusterName)
			}
			continue
		}
		if _, ok := api.LastDatabaseClusterStatus[databaseClusterName]; !ok && !api.DebtNamespaceMap[namespace] {
			// if the lastClusterStatus doesn't exist ，update status
			isSend = true
			api.LastDatabaseClusterStatus[databaseClusterName] = status
			api.ExceptionDatabaseMap[databaseClusterName] = true
		}
		if (status != "Running" || status != "Stopped") && !api.DebtNamespaceMap[namespace] {
			_, debt, debtLevel := checkDebt(namespace)
			alertMessage, feishuWebHook := "", ""
			if debt {
				databaseEvents, send := getDatabaseClusterEvents(databaseClusterName, namespace)
				if send {
					diskFull, err := checkDisk(namespace, databaseClusterName, databaseType)
					if err != nil {
						fmt.Printf("check disk err: %s \n", err)
					}
					if !diskFull {
						if status == "Deleting" || status == "Creating" || status == "Stopping" {
							feishuWebHook = api.FeishuWebhookURLMap["FeishuWebhookURLCSD"]
						} else {
							feishuWebHook = api.FeishuWebhookURLMap["FeishuWebhookURLUFA"]
						}
						alertMessage = notification.GetNotificationMessage(databaseClusterName, namespace, status, debtLevel, databaseEvents, "unknown")
					} else {
						if !api.DiskFullNamespaceMap[databaseClusterName] {
							feishuWebHook = api.FeishuWebhookURLMap["FeishuWebhookURLOther"]
							alertMessage = notification.GetNotificationMessage(databaseClusterName, namespace, status, debtLevel, databaseEvents, "disk is full")
							notificationMessage := "disk is full"
							//Notify user that disk is full

							notification.CreateNotification(namespace, databaseClusterName, status, notificationMessage)
						}
						api.DiskFullNamespaceMap[databaseClusterName] = true
					}
				} else {
					//Notify user that the quota is exceeded
					feishuWebHook = api.FeishuWebhookURLMap["FeishuWebhookURLOther"]
					alertMessage = notification.GetNotificationMessage(databaseClusterName, namespace, status, debtLevel, databaseEvents, "exceeded quota")
					notificationMessage := "exceeded quota"
					notification.CreateNotification(namespace, databaseClusterName, status, notificationMessage)
				}
				//CreateNotification(namespace, name, status)
				//database exception notification
				if isSend {
					api.FeishuWebHookMap[databaseClusterName] = feishuWebHook
					err = notification.SendFeishuNotification(alertMessage, feishuWebHook)
					if err != nil {
						fmt.Printf("Error sending exception notification: %v\n", err)
					}
				}
				continue
			}
			api.DebtNamespaceMap[namespace] = true
			delete(api.LastDatabaseClusterStatus, databaseClusterName)
			continue
		}
	}
	return nil
}

func getDatabaseClusterEvents(databaseClusterName, namespace string) (string, bool) {

	events, err := api.ClientSet.CoreV1().Events(namespace).List(context.TODO(), metav1.ListOptions{
		FieldSelector: fmt.Sprintf("involvedObject.name=%s", databaseClusterName),
	})
	if err != nil {
		panic(err.Error())
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

func getKubeConfig(namespace string) (string, error) {
	userName := strings.Split(namespace, "-")[1]
	user, err := api.DynamicClient.Resource(userGVR).Namespace("").Get(context.TODO(), userName, metav1.GetOptions{})
	if err != nil {
		return "", err
	}
	kubeConfig, found, err := unstructured.NestedString(user.UnstructuredContent(), "status", "kubeConfig")
	if err != nil {
		return "", err
	}
	if !found {
		return "", err
	}
	kubeConfig = strings.ReplaceAll(kubeConfig, ":", "%3A")
	kubeConfig = strings.ReplaceAll(kubeConfig, " ", "%20")
	kubeConfig = strings.ReplaceAll(kubeConfig, "\n", "%0A")
	return kubeConfig, nil
}
