package v1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"strings"
)

const userServiceAccountPrefix = "system:serviceaccount:ns-"

func isUserServiceAccount(sa string) bool {
	return strings.HasPrefix(sa, userServiceAccountPrefix)
}

func initAnnotationAndLabels(meta metav1.ObjectMeta) metav1.ObjectMeta {
	if meta.Annotations == nil {
		meta.Annotations = make(map[string]string)
	}
	if meta.Labels == nil {
		meta.Labels = make(map[string]string)
	}
	return meta
}
