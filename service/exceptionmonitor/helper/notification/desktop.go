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

func CreateNotification(notificationInfo *api.Info, notificationMessage, zhNotificationMessage string) {
	gvr := schema.GroupVersionResource{
		Group:    "notification.sealos.io",
		Version:  "v1",
		Resource: "notifications",
	}

	randomSuffix, _ := randString(5)
	now := time.Now().UTC().Unix()
	message := fmt.Sprintf("Because %s , Database %s current status : %s , Please check in time.", notificationMessage, notificationInfo.DatabaseClusterName, notificationInfo.ExceptionStatus)
	zhMessage := fmt.Sprintf("因为 %s , 数据库 %s 当前状态 : %s , 请及时检查.", zhNotificationMessage, notificationInfo.DatabaseClusterName, notificationInfo.ExceptionStatus)
	notification := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "notification.sealos.io/v1",
			"kind":       "Notification",
			"metadata": map[string]interface{}{
				"name": "database-exception" + notificationInfo.DatabaseClusterName + randomSuffix,
			},
			"spec": map[string]interface{}{
				"title":        "Database Exception",
				"message":      message,
				"timestamp":    now,
				"from":         "database-monitor-cronjob",
				"importance":   "High",
				"desktopPopup": true,
				"i18ns": map[string]interface{}{
					"zh": map[string]interface{}{
						"title":   "数据库异常告警",
						"message": zhMessage,
						"from":    "数据库异常",
					},
				},
			},
		},
	}

	_, err := api.DynamicClient.Resource(gvr).Namespace(notificationInfo.Namespace).Create(context.TODO(), notification, metav1.CreateOptions{})
	if err != nil {
		log.Printf("Failed to send desktop notification: %v", err)
	}
}
