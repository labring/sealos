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

package notification

import (
	"context"
	"sync"
	"time"

	v1 "github.com/labring/sealos/controllers/common/notification/api/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const maxBatchSize = 100
const maxChannelSize = 500

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

type NotificationManager struct {
	Ctx               context.Context
	Client            client.Client
	NotificationQueue []v1.Notification
}

// Run of the NotificationManager runs the notification manager.
// It writes the notifications in batches
func (nm *NotificationManager) Run() {
	pool := NewPool(maxBatchSize)
	pool.Run(maxChannelSize)
	for _, notification := range nm.NotificationQueue {
		notification := notification
		pool.Add(func() {
			err := write(nm.Ctx, nm.Client, &notification)
			if err != nil {
				logger.Error(err, "Failed to Do Notification Write Opt")
			}
		})
	}
	pool.Wait()
}

func (nm *NotificationManager) Load(receivers Receiver, events []Event) error {
	for _, event := range events {
		switch event.Kind {
		case General:
			nm.NotificationQueue = loadNotification(receivers.UserNamespaces,
				event, nm.NotificationQueue)
		case Admin:
			nm.NotificationQueue = loadNotification(receivers.AdminNamespaces,
				event, nm.NotificationQueue)
		}
	}
	return nil
}

func loadNotification(receivers []string, event Event, queue []v1.Notification) []v1.Notification {
	for _, receiver := range receivers {
		queue = append(queue, newNotification(receiver, event))
	}
	return queue
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

type Pool struct {
	wg   sync.WaitGroup
	work chan func()
}

func NewPool(size int) *Pool {
	p := &Pool{
		work: make(chan func()),
	}
	return p
}

func (p *Pool) Add(f func()) {
	p.work <- func() {
		f()
	}
}

func (p *Pool) Wait() {
	close(p.work)
	p.wg.Wait()
}

func (p *Pool) Run(size int) {
	p.wg.Add(size)
	for i := 0; i < size; i++ {
		go func() {
			for f := range p.work {
				f()
			}
		}()
		p.wg.Done()
	}
}
