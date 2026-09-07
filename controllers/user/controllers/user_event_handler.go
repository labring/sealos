// Copyright 2026 labring.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package controllers

import (
	"context"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/util/workqueue"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/priorityqueue"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/handler"
)

// userEventHandler keeps incomplete Users ahead of the initial historical
// queue after a restart. Creation time is insufficient because a User may have
// been waiting for reconciliation before the previous controller terminated.
type userEventHandler struct{}

var _ handler.EventHandler = userEventHandler{}

func (userEventHandler) Create(
	_ context.Context,
	evt event.CreateEvent,
	q workqueue.TypedRateLimitingInterface[ctrl.Request],
) {
	if evt.Object == nil {
		return
	}
	addUserRequest(q, evt.Object, userPriority(evt.Object))
}

func (userEventHandler) Update(
	_ context.Context,
	evt event.UpdateEvent,
	q workqueue.TypedRateLimitingInterface[ctrl.Request],
) {
	obj := evt.ObjectNew
	if obj == nil {
		obj = evt.ObjectOld
	}
	if obj == nil {
		return
	}
	// Accepted User updates change generation or the owner annotation, so they
	// represent live drift and must use the normal priority.
	addUserRequest(q, obj, 0)
}

func (userEventHandler) Delete(
	_ context.Context,
	evt event.DeleteEvent,
	q workqueue.TypedRateLimitingInterface[ctrl.Request],
) {
	if evt.Object == nil {
		return
	}
	addUserRequest(q, evt.Object, 0)
}

func (userEventHandler) Generic(
	_ context.Context,
	evt event.GenericEvent,
	q workqueue.TypedRateLimitingInterface[ctrl.Request],
) {
	if evt.Object == nil {
		return
	}
	addUserRequest(q, evt.Object, 0)
}

func addUserRequest(
	q workqueue.TypedRateLimitingInterface[ctrl.Request],
	obj client.Object,
	priority int,
) {
	request := ctrl.Request{NamespacedName: types.NamespacedName{
		Name:      obj.GetName(),
		Namespace: obj.GetNamespace(),
	}}
	priorityQueue, ok := q.(priorityqueue.PriorityQueue[ctrl.Request])
	if !ok {
		q.Add(request)
		return
	}

	priorityQueue.AddWithOpts(priorityqueue.AddOpts{Priority: priority}, request)
}

func userPriority(obj client.Object) int {
	user, ok := obj.(*userv1.User)
	if ok && !userStatusNeedsSync(user) {
		return handler.LowPriority
	}
	return 0
}
