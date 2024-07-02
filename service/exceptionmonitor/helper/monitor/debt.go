package monitor

import (
	"context"
	"strings"

	"github.com/labring/sealos/service/exceptionmonitor/helper/notification"

	"github.com/labring/sealos/service/exceptionmonitor/api"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

func checkDebt(namespace string) (bool, string, error) {
	// find debt crd
	debtName := getAccountNameByNamespace(namespace)
	debt, err := api.DynamicClient.Resource(debtGVR).Namespace(debtNamespace).Get(context.TODO(), debtName, metav1.GetOptions{})
	if err != nil {
		// processing error: Resource does not exist or other error
		if strings.Contains(err.Error(), "not found") {
			return checkOwnerDebt(namespace)
		}
		return false, "", err
	}
	status, found, err := unstructured.NestedString(debt.Object, "status", "status")
	if err != nil || !found {
		return false, status, err
	}
	if status == "NormalPeriod" {
		return true, status, nil
	}
	return false, status, nil
}

func getAccountNameByNamespace(namespace string) string {
	tmp := strings.Split(namespace, "-")
	tmp[0] = "debt"
	return strings.Join(tmp, "-")
}

func checkOwnerDebt(namespace string) (bool, string, error) {
	owner, err := notification.GetNSOwner(namespace)
	if err != nil {
		return false, "", err
	}
	ownerNamespace := "ns-" + owner
	return checkDebt(ownerNamespace)
}
