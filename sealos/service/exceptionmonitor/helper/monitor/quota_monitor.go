package monitor

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/labring/sealos/service/exceptionmonitor/api"
	"github.com/labring/sealos/service/exceptionmonitor/helper/notification"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func QuotaMonitor() {
	for api.QuotaMonitor {
		if err := checkQuota(api.ClusterNS); err != nil {
			log.Printf("Failed to check qouta: %v", err)
		}
		time.Sleep(3 * time.Hour)
	}
}

func checkQuota(namespaces []string) error {
	var namespaceList []v1.Namespace

	// Fetch namespaces based on MonitorType
	if api.MonitorType == api.MonitorTypeALL {
		namespaces, _ := api.ClientSet.CoreV1().Namespaces().List(context.Background(), metav1.ListOptions{})
		namespaceList = namespaces.Items
	} else {
		for _, ns := range namespaces {
			namespace, _ := api.ClientSet.CoreV1().Namespaces().Get(context.Background(), ns, metav1.GetOptions{})
			namespaceList = append(namespaceList, *namespace)
		}
	}
	for _, ns := range namespaceList {
		if !strings.Contains(ns.Name, "ns-") {
			continue
		}
		quotaList, err := api.ClientSet.CoreV1().ResourceQuotas(ns.Name).List(context.Background(), metav1.ListOptions{})
		if err != nil {
			log.Printf("Failed to check quota: %v", err)
		}
		//user debt
		if len(quotaList.Items) != 1 || quotaList.Items[0].Name != "quota-"+ns.Name {
			continue
		}
		nsQuota := api.NameSpaceQuota{
			NameSpace: ns.Name,
		}
		notificationInfo := api.Info{
			ExceptionType:    "Quota",
			PerformanceType:  "Quota",
			NotificationType: notification.ExceptionType,
		}
		send := processQuota(quotaList, &nsQuota)
		if send {
			message := notification.GetQuotaMessage(&nsQuota)
			notificationInfo.FeishuWebHook = api.FeishuWebhookURLMap["FeishuWebhookURLQuota"]
			if err := notification.SendFeishuNotification(&notificationInfo, message); err != nil {
				log.Printf("Error sending exception notification:%v", err)
			}
		}
	}
	return nil
}

func processQuota(quotaList *v1.ResourceQuotaList, nsQuota *api.NameSpaceQuota) bool {
	send := false
	for resourceName, hardQuantity := range quotaList.Items[0].Status.Hard {
		usedQuantity, exists := quotaList.Items[0].Status.Used[resourceName]
		if !exists {
			usedQuantity = *resource.NewQuantity(0, hardQuantity.Format)
		}

		hardValue, err := quantityToFloat64(hardQuantity, string(resourceName))
		if err != nil {
			log.Printf("Analytic hard constraint error : %s , %v\n", resourceName, err)
			continue
		}

		usedValue, err := quantityToFloat64(usedQuantity, string(resourceName))
		if err != nil {
			fmt.Printf("Analytic usage error :  %s , %v\n", resourceName, err)
			continue
		}

		// usage
		utilization := (usedValue / hardValue) * 100
		if utilization > api.QuotaThreshold {
			send = true
			switch resourceName {
			case "limits.cpu":
				nsQuota.CPULimit = hardQuantity.String()
				nsQuota.CPUUsage = fmt.Sprintf("%.2f%%", utilization)
			case "limits.memory":
				nsQuota.MemLimit = hardQuantity.String()
				nsQuota.MemUsage = fmt.Sprintf("%.2f%%", utilization)
			case "limits.nvidia.com/gpu":
				nsQuota.GPULimit = hardQuantity.String()
				nsQuota.GPUUsage = fmt.Sprintf("%.2f%%", utilization)
			case "limits.ephemeral-storage":
				nsQuota.EphemeralStorageLimit = hardQuantity.String()
				nsQuota.EphemeralStorageUsage = fmt.Sprintf("%.2f%%", utilization)
			case "objectstorage/size":
				nsQuota.ObjectStorageLimit = hardQuantity.String()
				nsQuota.ObjectStorageUsage = fmt.Sprintf("%.2f%%", utilization)
			case "services.nodeports":
				nsQuota.NodePortLimit = hardQuantity.String()
				nsQuota.NodePortUsage = fmt.Sprintf("%.2f%%", utilization)
			case "requests.storage":
				nsQuota.StorageLimit = hardQuantity.String()
				nsQuota.StorageUsage = fmt.Sprintf("%.2f%%", utilization)
			}
		}
	}
	return send
}

func quantityToFloat64(q resource.Quantity, resourceName string) (float64, error) {
	switch resourceName {
	case "limits.cpu", "requests.cpu", "cpu",
		"limits.nvidia.com/gpu", "requests.nvidia.com/gpu":
		return float64(q.MilliValue()), nil
	case "limits.memory", "requests.memory", "memory",
		"limits.ephemeral-storage", "requests.ephemeral-storage",
		"requests.storage", "objectstorage/size":
		return float64(q.Value()), nil
	case "services.nodeports":
		return float64(q.Value()), nil
	default:
		return q.AsApproximateFloat64(), nil
	}
}
