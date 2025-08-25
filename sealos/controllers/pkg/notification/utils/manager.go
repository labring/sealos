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

package utils

import (
	"context"
	"time"

	"github.com/go-logr/logr"

	v1 "github.com/labring/sealos/controllers/pkg/notification/api/v1"
	"github.com/labring/sealos/controllers/pkg/utils/logger"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// the best practice of notification api is the following:
//  1. use a notification builder to build a notification event queue,such as:
//     Queue := NotificationQueue{}
//     {&Builder}.WithFrom("from").WithMessage("message").WithType(General).WithLevel(Info).AddToEventQueue(&Queue)
//
// OR immediately build a notification event:
//	notification := NewNotificationEvent("title", "message", General, "from", Info)
//
// 2. decide the receiver of the notification,
//    step one: create a reveiverList, such as:
//    receiver := Receiver{}
// if just one, you can use the following:
//    receiver.SetReceiver("namespace", General)
// if you have a "Broadcasting Task", you can use the following:
//    receiver.Cache(&corev1.NamespaceList{})
//
// 3. use a notification manager to send the notification event queue to the receiver, such as:
//    manager := NotificationManager{}
//    manager.Load(receiver, events)
//    manager.Run()

// Features of the notification api:
// 1. support multiple receivers
// 2. support high concurrency
// 3. reduce the pressure of the kubernetes api server
// 4. decoupling of message generation and delivery, along with error tolerance mechanisms
// 5. allow users to focus solely on important tasks.

type Manager struct {
	ctx         context.Context
	client      client.Client
	logger      logr.Logger
	batchSize   int
	channelSize int
	queue       []v1.Notification
}

func NewNotificationManager(ctx context.Context, client client.Client,
	logger logr.Logger, batchSize, channelSize int) *Manager {
	return &Manager{
		ctx:         ctx,
		client:      client,
		logger:      logger,
		batchSize:   batchSize,
		channelSize: channelSize,
	}
}

// Run of the NotificationManager runs the notification manager.
// It writes the notifications in batches
func (nm *Manager) Run() {
	pool := NewPool(nm.batchSize)
	pool.Run(nm.channelSize)
	for _, notification := range nm.queue {
		notification := notification
		pool.Add(func() {
			err := write(nm.ctx, nm.client, &notification)
			if err != nil {
				logger.Error(err, "Failed to Do Notification Write Opt")
			}
		})
	}
	pool.Wait()
}

func (nm *Manager) Load(receivers *Receiver, events []Event) *Manager {
	for _, event := range events {
		nm.loadNotification(receivers.receivers, event)
	}
	return nm
}

func (nm *Manager) loadNotification(receivers []string, event Event) {
	for _, receiver := range receivers {
		nm.queue = append(nm.queue, newNotification(receiver, event))
	}
}

func write(ctx context.Context, client client.Client, obj client.Object, opts ...client.CreateOption) error {
	err := client.Create(ctx, obj, opts...)
	if err != nil && apierrors.IsAlreadyExists(err) {
		return nil
	}
	return err
}

func newNotification(receiver string, event Event) v1.Notification {
	return v1.Notification{
		ObjectMeta: metav1.ObjectMeta{
			Name:      event.ID,
			Namespace: receiver,
		},
		Spec: v1.NotificationSpec{
			Importance: event.Level,
			Message:    event.Message,
			Timestamp:  time.Now().Unix(),
			From:       event.From,
			Title:      event.Title,
		},
	}
}
