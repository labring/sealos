package api

import (
	"context"

	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func EnsureNamespace(name string) *v1.Namespace {
	client := GetDefaultKubernetesClient()
	ns, err := client.CoreV1().Namespaces().Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		return CreateNamespace(client, name)
	}
	return ns
}

func DeleteNamespace(name string) error {
	client := GetDefaultKubernetesClient()
	err := client.CoreV1().Namespaces().Delete(context.TODO(), name, metav1.DeleteOptions{})
	if err != nil {
		return err
	}
	return nil
}
