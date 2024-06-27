package notification

import (
	"context"
	"crypto/rand"
	"fmt"
	"log"
	"math/big"
	"time"

	"github.com/labring/sealos/service/exceptionmonitor/api"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

const (
	letterBytes = "abcdefghijklmnopqrstuvwxyz"
	letterLen   = len(letterBytes)
)

func randString(n int) (string, error) {
	b := make([]byte, n)
	for i := range b {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(letterLen)))
		if err != nil {
			return "", err
		}
		b[i] = letterBytes[num.Int64()]
	}
	return string(b), nil
}

func CreateNotification(namespace, name, status, notificationMessage string) {
	gvr := schema.GroupVersionResource{
		Group:    "notification.sealos.io",
		Version:  "v1",
		Resource: "notifications",
	}

	randomSuffix, _ := randString(5)
	now := time.Now().UTC().Unix()
	message := fmt.Sprintf("database : %s is %s. Please check in time.", name, status)
	notification := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "notification.sealos.io/v1",
			"kind":       "Notification",
			"metadata": map[string]interface{}{
				"name": "database-exception" + name + randomSuffix,
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

	_, err := api.DynamicClient.Resource(gvr).Namespace(namespace).Create(context.TODO(), notification, metav1.CreateOptions{})
	if err != nil {
		log.Printf("Failed to send desktop notification: %v", err)
	}
}
