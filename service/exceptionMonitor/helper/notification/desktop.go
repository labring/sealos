package notification

import (
	"context"
	"exceptionMonitor/api"
	"fmt"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"time"
)

func CreateNotification(namespace, name, status, notificationMessage string) {

	gvr := schema.GroupVersionResource{
		Group:    "notification.sealos.io",
		Version:  "v1",
		Resource: "notifications",
	}

	now := time.Now().UTC().Unix()
	message := "database : " + name + " is " + status + ". Please check in time."
	notification := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "notification.sealos.io/v1",
			"kind":       "Notification",
			"metadata": map[string]interface{}{
				"name": "database-monitor-notification",
			},
			"spec": map[string]interface{}{
				"title":        "Database Exception",
				"message":      message,
				"timestamp":    now,
				"from":         "database-monitor-cronjob",
				"importance":   "High",
				"desktopPopup": true,
				"i18ns": map[string]interface{}{
					"en": map[string]interface{}{
						"title":   "Database Exception",
						"message": notificationMessage,
						"from":    "Database Exception",
					},
				},
			},
		},
	}

	// create notification crd
	_, err := api.DynamicClient.Resource(gvr).Namespace(namespace).Create(context.TODO(), notification, metav1.CreateOptions{})
	if err != nil {
		fmt.Println(err.Error())
	}
}
