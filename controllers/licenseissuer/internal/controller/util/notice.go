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

	notificationv1 "github.com/labring/sealos/controllers/common/notification/api/v1"
	ntf "github.com/labring/sealos/controllers/pkg/notification"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type notice struct {
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

func (n *notice) noticeWork(instance *TaskInstance) error {
	// init
	receiver := ntf.Receiver{
		Context: instance.ctx,
		Client:  instance.Client,
	}
	manager := ntf.NotificationManager{
		Ctx:    instance.ctx,
		Client: instance.Client,
	}
	// get uid and url-map
	uid, urlMap, err := GetUIDURL(instance.ctx, instance.Client)

	request := (&NotificationRequest{}).setTimestamp(n.lastTime).setUID(uid)

	// pull from the cloud
	response, err := Pull(urlMap[NotificationURL], request)
	if err != nil {
		instance.logger.Error(err, "failed to pull from cloud")
		return err
	}

	// get notice-events from response
	events, err := n.getEvents(instance, response.Body)
	if err != nil {
		instance.logger.Error(err, "failed to get events")
		return err
	}

	// get receivers
	err = receiver.Cache(&corev1.NamespaceList{})

	if err != nil {
		instance.logger.Error(err, "failed to cache namespace")
		return err
	}

	err = manager.Load(receiver, events)
	if err != nil {
		instance.logger.Error(err, "failed to load notification")
		return err
	}
	manager.Run()
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
		Namespace: SealosNamespace,
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
		Namespace: SealosNamespace,
	}, info)
	if err != nil {
		return "", fmt.Errorf("failed to get cluster-info: %w", err)
	}
	uid := string(info.Data["uuid"])
	return uid, nil
}

func (n *notice) getEvents(instance *TaskInstance, body []byte) ([]ntf.Event, error) {
	var resps []NotificationResponse
	var events []ntf.Event
	err := Convert(body, &resps)
	if err != nil {
		instance.logger.Error(err, "failed to convert response")
		return nil, err
	}
	for _, resp := range resps {
		// get notification from response
		events = append(events, ntf.NewNotificationEvent(
			resp.Title,
			resp.Message,
			ntf.General,
			NoticeFrom,
			notificationv1.Low,
		))
		if resp.Timestamp > n.lastTime {
			n.lastTime = resp.Timestamp
		}
	}

	return events, nil
}
