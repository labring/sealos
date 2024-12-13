package monitor

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/labring/sealos/service/exceptionmonitor/api"
	"github.com/labring/sealos/service/exceptionmonitor/helper/notification"
	"k8s.io/apimachinery/pkg/api/errors"
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
	databasePodNameMap = map[string]string{
		"redis":          "redis",
		"kafka":          "kafka-broker",
		"apecloud-mysql": "mysql",
		"postgresql":     "postgresql",
		"milvus":         "milvus",
		"mongodb":        "mongodb",
	}
)

func DatabaseExceptionMonitor() {
	for api.DatabaseMonitor {
		checkDeletedDatabases()
		if err := checkDatabases(api.ClusterNS); err != nil {
			log.Printf("Failed to check databases: %v", err)
		}
		time.Sleep(5 * time.Minute)
	}
}

func checkDeletedDatabases() {
	//for databaseClusterUID, namespaceAndDatabaseClusterName := range api.DatabaseNamespaceMap {
	for _, notificationInfo := range api.DatabaseNotificationInfoMap {
		//namespace, databaseClusterName := getNamespaceAndDatabaseClusterName(namespaceAndDatabaseClusterName)
		cluster, err := api.DynamicClient.Resource(databaseClusterGVR).Namespace(notificationInfo.Namespace).Get(context.Background(), notificationInfo.DatabaseClusterName, metav1.GetOptions{})
		if cluster == nil && errors.IsNotFound(err) {
			//notificationInfo := api.Info{
			//	DatabaseClusterUID:  databaseClusterUID,
			//	Namespace:           notificationInfo.Namespace,
			//	DatabaseClusterName: databaseClusterName,
			//	RecoveryStatus:      "Deleted",ws
			//}
			notificationInfo.RecoveryStatus = "Deleted"
			notificationInfo.RecoveryTime = time.Now().Format("2006-01-02 15:04:05")
			handleClusterRecovery(notificationInfo)
		}
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
	// todo 获取数据库信息抽成一个函数，封装在notificationInfo中
	notificationInfo := api.Info{}
	getClusterDatabaseInfo(cluster, &notificationInfo)
	switch notificationInfo.ExceptionStatus {
	case api.StatusRunning, api.StatusStopped:
		if value, ok := api.DatabaseNotificationInfoMap[notificationInfo.DatabaseClusterUID]; ok {
			recoveryNotificationInfo := value
			recoveryNotificationInfo.RecoveryStatus, recoveryNotificationInfo.RecoveryTime = getClusterDatabaseStatus(cluster, recoveryNotificationInfo)
			handleClusterRecovery(recoveryNotificationInfo)
		}
	case api.StatusDeleting, api.StatusStopping:
		// nothing to do
		break
	case api.StatusUnknown:
		if _, ok := api.DatabaseNotificationInfoMap[notificationInfo.DatabaseClusterUID]; !ok {
			api.DatabaseNotificationInfoMap[notificationInfo.DatabaseClusterUID] = &notificationInfo
			//api.LastDatabaseClusterStatus[notificationInfo.DatabaseClusterUID] = notificationInfo.ExceptionStatus
			//api.DatabaseNamespaceMap[notificationInfo.DatabaseClusterUID] = notificationInfo.Namespace + "-" + notificationInfo.DatabaseClusterName
			//api.ExceptionDatabaseMap[notificationInfo.DatabaseClusterUID] = true
			notificationInfo.Events = "status is empty"
			notificationInfo.DebtLevel = ""
			alertMessage := prepareAlertMessage(&notificationInfo, 0)
			if err := sendAlert(alertMessage, &notificationInfo); err != nil {
				log.Printf("Failed to send feishu %s in ns %s: %v", notificationInfo.DatabaseClusterName, notificationInfo.Namespace, err)
			}
		}
	default:
		//Updating、Creating、Failed、Abnormal
		//notificationInfo.DatabaseClusterUID, databaseClusterName, namespace, databaseType, status
		handleClusterException(&notificationInfo)
	}
}

func handleClusterRecovery(notificationInfo *api.Info) {
	//if api.ExceptionDatabaseMap[notificationInfo.DatabaseClusterUID] {
	notificationInfo.NotificationType = "recovery"
	recoveryMessage := notification.GetNotificationMessage(notificationInfo)
	//getClusterDatabaseStatus应该在上层去做，因为有可能是已经删的数据状态更新信息，在这里获取的话，就没法拿到状态信息
	//notificationInfo.RecoveryStatus, notificationInfo.RecoveryStatusTime = getClusterDatabaseStatus(cluster, notificationInfo)
	if err := notification.SendFeishuNotification(notificationInfo, recoveryMessage); err != nil {
		log.Printf("Error sending recovery notification: %v", err)
	}
	cleanClusterStatus(notificationInfo.DatabaseClusterUID)
}

func cleanClusterStatus(databaseClusterUID string) {
	delete(api.DatabaseNotificationInfoMap, databaseClusterUID)
	delete(api.DiskFullNamespaceMap, databaseClusterUID)
	//delete(api.FeishuWebHookMap, databaseClusterUID)
	//delete(api.ExceptionDatabaseMap, databaseClusterUID)
	//delete(api.DatabaseNamespaceMap, databaseClusterUID)
}

func handleClusterException(notificationInfo *api.Info) {
	if _, ok := api.DatabaseNotificationInfoMap[notificationInfo.DatabaseClusterUID]; !ok && !api.DebtNamespaceMap[notificationInfo.Namespace] {
		api.DatabaseNotificationInfoMap[notificationInfo.DatabaseClusterUID] = notificationInfo
		//api.LastDatabaseClusterStatus[notificationInfo.DatabaseClusterUID] = notificationInfo.ExceptionStatus
		//api.DatabaseNamespaceMap[notificationInfo.DatabaseClusterUID] = notificationInfo.Namespace + "-" + notificationInfo.DatabaseClusterName
		//api.ExceptionDatabaseMap[notificationInfo.DatabaseClusterUID] = true
		//notificationInfo.DatabaseClusterUID, databaseClusterName, namespace, databaseType, status
		if err := processClusterException(notificationInfo); err != nil {
			log.Printf("Failed to process cluster %s exception in ns %s: %v", notificationInfo.DatabaseClusterName, notificationInfo.Namespace, err)
		}
	}
}

func processClusterException(notificationInfo *api.Info) error {
	debt, debtLevel, _ := checkDebt(notificationInfo.Namespace)
	notificationInfo.DebtLevel = debtLevel
	if debt {
		//databaseClusterName, namespace
		databaseEvents, send := getDatabaseClusterEvents(notificationInfo)
		if send {
			//namespace, databaseClusterName, databaseType
			maxUsage, err := checkPerformance(notificationInfo, "disk")
			if err != nil {
				return err
			}
			notificationInfo.Events = databaseEvents
			//notificationInfo.DatabaseClusterUID, databaseClusterName, namespace, status, debtLevel, databaseEvents
			alertMessage := prepareAlertMessage(notificationInfo, maxUsage)
			if err := sendAlert(alertMessage, notificationInfo); err != nil {
				return err
			}
		} else {
			//databaseClusterName, namespace, status, debtLevel
			if err := notifyQuotaExceeded(notificationInfo); err != nil {
				return err
			}
		}
	} else {
		api.DebtNamespaceMap[notificationInfo.Namespace] = true
		delete(api.DatabaseNotificationInfoMap, notificationInfo.DatabaseClusterUID)
	}
	return nil
}

func getDatabaseClusterEvents(notificationInfo *api.Info) (string, bool) {
	events, err := api.ClientSet.CoreV1().Events(notificationInfo.Namespace).List(context.TODO(), metav1.ListOptions{
		FieldSelector: fmt.Sprintf("involvedObject.name=%s", notificationInfo.DatabaseClusterName),
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

func prepareAlertMessage(notificationInfo *api.Info, maxUsage float64) string {
	alertMessage := ""
	notificationInfo.ExceptionType = "状态"
	notificationInfo.NotificationType = notification.ExceptionType
	if maxUsage < api.DatabaseExceptionMonitorThreshold {
		//status == "Creating" || status == "Deleting" || status == "Stopping"
		if notificationInfo.ExceptionStatus == "Creating" {
			notificationInfo.FeishuWebHook = api.FeishuWebhookURLMap["FeishuWebhookURLCSD"]
		} else {
			notificationInfo.FeishuWebHook = api.FeishuWebhookURLMap["FeishuWebhookURLUFA"]
		}
		alertMessage = notification.GetNotificationMessage(notificationInfo)
	} else {
		if !api.DiskFullNamespaceMap[notificationInfo.DatabaseClusterUID] {
			notificationInfo.FeishuWebHook = api.FeishuWebhookURLMap["FeishuWebhookURLOther"]
			notificationInfo.Reason = "disk is full"
			alertMessage = notification.GetNotificationMessage(notificationInfo)
			//namespace, databaseClusterName, status
			notification.CreateNotification(notificationInfo, "disk is full", "磁盘满了")
		}
		api.DiskFullNamespaceMap[notificationInfo.DatabaseClusterUID] = true
	}
	return alertMessage
}

func sendAlert(alertMessage string, notificationInfo *api.Info) error {
	//api.FeishuWebHookMap[notificationInfo.DatabaseClusterUID] = feishuWebHook
	return notification.SendFeishuNotification(notificationInfo, alertMessage)
}

func notifyQuotaExceeded(notificationInfo *api.Info) error {
	notificationInfo.ExceptionType = "状态"
	notificationInfo.Reason = api.ExceededQuotaException
	notificationInfo.NotificationType = notification.ExceptionType
	notificationInfo.FeishuWebHook = api.FeishuWebhookURLMap["FeishuWebhookURLOther"]
	alertMessage := notification.GetNotificationMessage(notificationInfo)
	notification.CreateNotification(notificationInfo, api.ExceededQuotaException, "Quato满了")
	return notification.SendFeishuNotification(notificationInfo, alertMessage)
}

func getClusterDatabaseInfo(cluster metav1unstructured.Unstructured, notificationInfo *api.Info) {
	databaseClusterName, databaseType, namespace, databaseClusterUID := cluster.GetName(), cluster.GetLabels()[api.DatabaseTypeLabel], cluster.GetNamespace(), string(cluster.GetUID())
	notificationInfo.DatabaseType = databaseType
	notificationInfo.Namespace = namespace
	notificationInfo.DatabaseClusterName = databaseClusterName
	notificationInfo.DatabaseClusterUID = databaseClusterUID
	notificationInfo.ExceptionStatus, notificationInfo.ExceptionStatusTime = getClusterDatabaseStatus(cluster, notificationInfo)
}

func getClusterDatabaseStatus(cluster metav1unstructured.Unstructured, notificationInfo *api.Info) (string, string) {
	status, _, _ := metav1unstructured.NestedString(cluster.Object, "status", "phase")

	databaseClusterStatus, _, _ := metav1unstructured.NestedMap(cluster.Object, "status")

	podName := databasePodNameMap[notificationInfo.DatabaseType]
	podsReadyTime, _, _ := metav1unstructured.NestedString(databaseClusterStatus, "components", podName, "podsReadyTime")

	parsedTime, _ := time.Parse(time.RFC3339, podsReadyTime)
	adjustedTime := parsedTime.Add(8 * time.Hour)

	formattedTime := adjustedTime.Format("2006-01-02 15:04:05")
	return status, formattedTime
}
