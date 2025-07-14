package monitor

import (
	"context"
	"github.com/labring/sealos/service/exceptionmonitor/helper/notification"

	"github.com/labring/sealos/service/exceptionmonitor/api"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func checkDebt(namespace string) (bool, string, error) {
	// find quota crd
	_, err := api.DynamicClient.Resource(quotaGVR).Namespace(namespace).Get(context.TODO(), "debt-limit0", metav1.GetOptions{})
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return true, "NormalPeriod", nil
		}
		return true, "", err
	}
	return false, "debt-limit0", nil

}

func checkOwnerDebt(namespace string) (bool, string, error) {
	owner, err := notification.GetNSOwner(namespace)
	if err != nil {
		return false, "", err
	}
	ownerNamespace := "ns-" + owner
	return checkDebt(ownerNamespace)
}
