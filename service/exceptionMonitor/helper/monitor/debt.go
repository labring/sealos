package monitor

import (
	"context"
	"exceptionMonitor/api"
	"fmt"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"strings"
)

func checkDebt(namespace string) (error, bool, string) {

	// find debt crd
	debtName := getAccountNameByNamespace(namespace)
	debt, err := api.DynamicClient.Resource(debtGVR).Namespace(debtNamespace).Get(context.TODO(), debtName, metav1.GetOptions{})
	if err != nil {
		// processing error: Resource does not exist or other error
		if strings.Contains(err.Error(), "not found") {
			return checkOwnerDebt(namespace)
		} else {
			fmt.Printf("Error getting debt: %s %s\n", err.Error(), namespace)
			return err, false, ""
		}
	}
	status, found, err := unstructured.NestedString(debt.Object, "status", "status")
	if err != nil || !found {
		fmt.Printf("Unable to get %s status in account-system %s: %v\n", namespace, debtName, err)
		return err, false, status
	}
	if status == "NormalPeriod" {
		return nil, true, status
	}
	return nil, false, status
}

func getAccountNameByNamespace(namespace string) string {
	tmp := strings.Split(namespace, "-")
	tmp[0] = "debt"
	return strings.Join(tmp, "-")
}

func checkOwnerDebt(namespace string) (error, bool, string) {
	err, owner := GetNSOwner(namespace)
	if err != nil {
		return err, false, ""
	}
	ownerNamespace := "ns-" + owner
	return checkDebt(ownerNamespace)
}

func GetNSOwner(namespace string) (error, string) {
	// find owner debt
	ns, err := api.ClientSet.CoreV1().Namespaces().Get(context.Background(), namespace, metav1.GetOptions{})
	if err != nil {
		fmt.Printf("Error getting debt: %s %s\n", err.Error(), namespace)
		return err, ""
	}
	return nil, ns.Labels[api.OwnerLabel]
}
