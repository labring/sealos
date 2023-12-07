package clusterid

import (
	"context"
	"fmt"

	corev1 "k8s.io/api/core/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

func GetClusterID(ctx context.Context, c client.Client) (string, error) {
	ns := &corev1.Namespace{}
	err := c.Get(ctx, client.ObjectKey{Name: "kube-system"}, ns)
	if err != nil {
		return "", err
	}
	res := string(ns.UID)
	if res == "" || len(res) < 8 {
		return "", fmt.Errorf("failed to get cluster id")
	}
	return res[0:8], nil
}
