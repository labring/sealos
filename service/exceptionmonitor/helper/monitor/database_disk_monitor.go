package monitor

import (
	"context"
	"fmt"

	"github.com/labring/sealos/service/exceptionmonitor/api"
	"github.com/labring/sealos/service/exceptionmonitor/helper/notification"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

func CheckDatabaseDisk() {
	var clusters *unstructured.UnstructuredList
	var err error
	clusters, err = api.DynamicClient.Resource(databaseClusterGVR).List(context.Background(), metav1.ListOptions{})
	if err != nil {
		fmt.Printf("Failed to get clusters: %v\n", err)
		return
	}

	for _, cluster := range clusters.Items {
		databaseClusterName, databaseType, namespace, UID := cluster.GetName(), cluster.GetLabels()[api.DatabaseTypeLabel], cluster.GetNamespace(), string(cluster.GetUID())
		maxUsage, err := checkDisk(namespace, databaseClusterName, databaseType)
		if err != nil {
			fmt.Printf("Failed to check database disk: %v\n", err)
			continue
		}
		if maxUsage >= databaseDiskMonitorThreshold {
			ownerNS, err := GetNSOwner(namespace)
			if err != nil {
				fmt.Printf("Failed to get ns owner: %v\n", err)
			}
			if api.DiskMonitorNamespaceMap[UID] {
				continue
			}
			err = notification.SendToSms(ownerNS, databaseClusterName, api.ClusterName, "磁盘超过百分之八十")
			if err != nil {
				fmt.Printf("Failed to send sms to user: %v\n", err)
				continue
			}
			api.DiskMonitorNamespaceMap[UID] = true
		} else {
			if api.DiskMonitorNamespaceMap[UID] {
				delete(api.DiskMonitorNamespaceMap, UID)
			}
		}
	}
}
