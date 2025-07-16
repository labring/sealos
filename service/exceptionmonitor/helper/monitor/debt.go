package monitor

import (
	"context"

	"github.com/labring/sealos/service/exceptionmonitor/api"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
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
