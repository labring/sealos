package monitor

import (
	"context"
	"fmt"

	"github.com/labring/sealos/service/exceptionmonitor/api"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

func CheckDatabaseDisk() error {
	var clusters *unstructured.UnstructuredList
	var err error
	clusters, err = api.DynamicClient.Resource(databaseClusterGVR).List(context.Background(), metav1.ListOptions{})
	if err != nil {
		return err
	}
	for _, cluster := range clusters.Items {
		databaseClusterName, databaseType, namespace, UID := cluster.GetName(), cluster.GetLabels()[api.DatabaseTypeLabel], cluster.GetNamespace(), string(cluster.GetUID())
		diskFull, err := checkDisk(namespace, databaseClusterName, databaseType, UID, "databaseDiskExceptionCheck")
		if err != nil {
			return err
		}
		if diskFull {
			api.DiskMonitorNamespaceMap[UID] = true
			fmt.Println("cccccc")
			fmt.Println(api.DiskMonitorNamespaceMap)
		}
	}
	return nil
}
