/*
Copyright 2023.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package util

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/labring/sealos/controllers/pkg/notification/utils"

	notificationv1 "github.com/labring/sealos/controllers/pkg/notification/api/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// the NoticeWork task is used to get the notification from the cloud.
// And then send the notification to the cluster.
type NoticeWork struct {
	lastTime int64
}

type NotificationResponse struct {
	ID        string `json:"_id"`
	Type      string `json:"msgType"`
	Title     string `json:"title"`
	Message   string `json:"message"`
	Timestamp int64  `json:"timestamp"`
}

type NotificationRequest struct {
	UID       string `json:"uid"`
	Timestamp int64  `json:"timestamp"`
}

func (nr *NotificationRequest) setUID(uid string) *NotificationRequest {
	nr.UID = uid
	return nr
}

func (nr *NotificationRequest) setTimestamp(timestamp int64) *NotificationRequest {
	nr.Timestamp = timestamp
	return nr
}

func (n *NoticeWork) noticeWork(instance *TaskInstance) error {
	// init
	receiver := utils.NewReceiver(instance.ctx, instance.Client)
	manager := utils.NewNotificationManager(instance.ctx, instance.Client,
		instance.logger, maxBatchSize, maxChannelSize)
	// get uid and url-map
	uid, urlMap, err := GetUIDURL(instance.ctx, instance.Client)
	if err != nil {
		instance.logger.Info("failed to get uid and url-map", "err", err)
		return err
	}

	request := (&NotificationRequest{}).setTimestamp(n.lastTime).setUID(uid)

	// pull from the cloud
	response, err := Pull(urlMap[NotificationURL], request)
	if err != nil {
		instance.logger.Info("failed to pull from cloud", "err", err)
		return err
	}

	// get notice-events from response
	events, err := n.getEvents(instance, response.Body)
	if err != nil {
		instance.logger.Info("failed to get events", "err", err)
		return err
	}

	// get receivers
	receiver.AddReceivers(n.getUserNamespace(instance, filter))

	manager.Load(receiver, events).Run()
	return nil
}

func GetUIDURL(ctx context.Context, client client.Client) (string, map[string]string, error) {
	urlMap, err := GetURL(ctx, client)
	if err != nil {
		return "", nil, fmt.Errorf("failed to get url-map: %w", err)
	}
	uid, err := GetUID(ctx, client)
	if err != nil {
		return "", nil, fmt.Errorf("failed to get uid: %w", err)
	}
	return uid, urlMap, nil
}

func GetURL(ctx context.Context, client client.Client) (map[string]string, error) {
	urlConfigMap := &corev1.ConfigMap{}
	id := types.NamespacedName{
		Name:      URLConfig,
		Namespace: GetOptions().GetEnvOptions().Namespace,
	}
	// get url-config from k8s
	err := client.Get(ctx, id, urlConfigMap)
	if err != nil {
		return nil, fmt.Errorf("failed to get url-config: %w", err)
	}
	// get url-map from url-config
	urlMap, err := GetConfigFromConfigMap(URLConfig, urlConfigMap)
	if err != nil {
		return nil, fmt.Errorf("failed to get url-map: %w", err)
	}
	return urlMap, nil
}

func GetUID(ctx context.Context, client client.Client) (string, error) {
	info := &corev1.Secret{}
	err := client.Get(ctx, types.NamespacedName{
		Name:      ClusterInfo,
		Namespace: GetOptions().GetEnvOptions().Namespace,
	}, info)
	if err != nil {
		return "", fmt.Errorf("failed to get cluster-info: %w", err)
	}
	uid := string(info.Data["uuid"])
	return uid, nil
}

func NewNotice() *NoticeWork {
	return &NoticeWork{lastTime: time.Now().Add(-7 * time.Hour).Unix()}
}

func (n *NoticeWork) getEvents(instance *TaskInstance, body []byte) ([]utils.Event, error) {
	var resps []NotificationResponse
	var events []utils.Event
	err := Convert(body, &resps)
	if err != nil {
		instance.logger.Info("failed to convert body", "err", err)
		return nil, err
	}
	for _, resp := range resps {
		// get notification from response
		events = append(events, utils.NewNotificationEvent(
			resp.Title,
			resp.Message,
			utils.General,
			NoticeFrom,
			notificationv1.Low,
		))
		if resp.Timestamp > n.lastTime {
			n.lastTime = resp.Timestamp
		}
	}

	return events, nil
}

// the NoticeCleaner task is used to clean the notification in the cluster periodically.
type NoticeCleaner struct {
	lastTime int64
}

func NewNoticeCleaner() *NoticeCleaner {
	return &NoticeCleaner{lastTime: time.Now().Unix()}
}

func (nc *NoticeCleaner) cleanWork(instance *TaskInstance) error {
	// catch all notification in the cluster
	notifications := &notificationv1.NotificationList{}

	err := instance.List(instance.ctx, notifications)
	if err != nil {
		instance.logger.Info("failed to list notification", "err", err)
		return err
	}
	// Get the notification that needs to be deleted
	expiredNotifications, err := nc.getNotificationsExpired(instance)
	if err != nil {
		instance.logger.Info("failed to get expired notification", "err", err)
		return err
	}
	// delete the notification
	pool := utils.NewPool(maxBatchSize)
	pool.Run(maxChannelSize)
	for _, notification := range expiredNotifications {
		newCopy := notification
		pool.Add(func() {
			err := instance.Delete(instance.ctx, &newCopy)
			if err != nil {
				instance.logger.Info("failed to delete notification", "err", err)
			}
		})
	}
	pool.Wait()
	return nil
}

func (nc *NoticeCleaner) getNotificationsExpired(instance *TaskInstance) ([]notificationv1.Notification, error) {
	notifications := &notificationv1.NotificationList{}
	err := instance.List(instance.ctx, notifications)
	if err != nil {
		instance.logger.Info("failed to list notification", "err", err)
		return nil, err
	}
	var expiredNotifications []notificationv1.Notification

	for _, notification := range notifications.Items {
		timeStamp := notification.Spec.Timestamp
		switch notification.Spec.Importance {
		case notificationv1.High:
			if time.Unix(timeStamp, 0).Add(time.Hour * 24 * 15).Before(time.Now()) {
				expiredNotifications = append(expiredNotifications, notification)
			}
		case notificationv1.Medium:
			if time.Unix(timeStamp, 0).Add(time.Hour * 24 * 7).Before(time.Now()) {
				expiredNotifications = append(expiredNotifications, notification)
			}
		case notificationv1.Low:
			if time.Unix(timeStamp, 0).Add(time.Hour * 24 * 3).Before(time.Now()) {
				expiredNotifications = append(expiredNotifications, notification)
			}
		default:
			if time.Unix(timeStamp, 0).Add(time.Hour * 24 * 3).Before(time.Now()) {
				expiredNotifications = append(expiredNotifications, notification)
			}
		}
	}
	return expiredNotifications, nil
}

const maxBatchSize = 100
const maxChannelSize = 500

type FilterFunc func(string) bool

func (n *NoticeWork) getUserNamespace(instance *TaskInstance, opt FilterFunc) []string {
	namespaceList := &corev1.NamespaceList{}
	err := instance.List(instance.ctx, namespaceList)
	if err != nil {
		instance.logger.Info("failed to list namespace", "err", err)
		return nil
	}
	var namespaces []string
	for _, namespace := range namespaceList.Items {
		if opt(namespace.Name) {
			namespaces = append(namespaces, namespace.Name)
		}
	}
	return namespaces
}

func filter(ns string) bool {
	return strings.HasPrefix(ns, utils.GeneralPrefix)
}
