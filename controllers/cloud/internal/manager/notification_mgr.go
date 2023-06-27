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

package manager

import (
	"context"
	"errors"
	"math"
	"strings"
	"sync"
	"time"

	ntf "github.com/labring/sealos/controllers/common/notification/api/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	cl "sigs.k8s.io/controller-runtime/pkg/client"
)

const (
	UserPrefix string = "ns-"
	AdmPrefix  string = "adm-"
)

const maxRetries = 3

type NotificationManager struct {
	RWMutex            sync.RWMutex
	TimeLastPull       int64
	ExpireToUpdate     int64
	ExpireToUpdateUser int64
	UserNameSpaceGroup map[string]int
	AdmNamespaceGroup  map[string]int
	ErrorChannel       chan *ErrorMgr
	NotificationCache  []ntf.Notification
}

type NotificationTask struct {
	Size               int
	Pos                int
	Ns                 string
	RWMutex            *sync.RWMutex
	UserNameSpaceGroup map[string]int
	AdmNamespaceGroup  map[string]int
	NotificationCache  []ntf.Notification
}

func (nm *NotificationManager) GetNameSpace(ctx context.Context, client cl.Client) *ErrorMgr {
	nsList := &corev1.NamespaceList{}
	if err := client.List(ctx, nsList); err != nil {
		return NewErrorMgr("client.List", err.Error())
	}
	for _, ns := range nsList.Items {
		addNamespaceIfMissing(UserPrefix, nm.UserNameSpaceGroup, ns.Name)
		addNamespaceIfMissing(AdmPrefix, nm.AdmNamespaceGroup, ns.Name)
	}
	return nil
}

func (nm *NotificationManager) UpdateManager() {
	nm.ExpireToUpdate += int64(72 * time.Hour)
	nm.NotificationCache = []ntf.Notification{}
	resetMapValues(nm.AdmNamespaceGroup)
	resetMapValues(nm.UserNameSpaceGroup)
}

func NewNotificationManager() *NotificationManager {
	return &NotificationManager{
		TimeLastPull:       time.Now().Add(-7 * 24 * time.Hour).Unix(),
		ExpireToUpdateUser: time.Now().Unix(),
		ExpireToUpdate:     time.Now().Unix(),
		UserNameSpaceGroup: make(map[string]int),
		AdmNamespaceGroup:  make(map[string]int),
		NotificationCache:  make([]ntf.Notification, 0),
	}
}

func (nm *NotificationManager) callbackConvert(data interface{}) error {
	notifications, ok := data.(*[]NotificationResponse)
	if !ok {
		return errors.New("error type, expected []Notification")
	}
	var timestamp int64
	for _, notification := range *notifications {
		if timestamp < notification.Timestamp {
			timestamp = notification.Timestamp
		}
		nm.NotificationCache = append(nm.NotificationCache, NotificationResponseToNotification(notification))
	}
	if timestamp > nm.TimeLastPull {
		nm.TimeLastPull = timestamp
	}
	return nil
}

func NotificationResponseToNotification(resp NotificationResponse) ntf.Notification {
	var res ntf.Notification
	res.Name = resp.ID
	res.Spec.Title = resp.Title
	res.Spec.Message = resp.Message
	res.Spec.Timestamp = time.Now().Unix()
	res.Spec.From = "Sealos Cloud"
	res.SetGroupVersionKind(schema.GroupVersionKind{Group: "notification.sealos.io", Version: "v1", Kind: "Notification"})
	return res
}

func (nt NotificationTask) Work(ctx context.Context, client cl.Client) error {
	if nt.Pos >= nt.Size {
		return nil
	}
	var targetMap map[string]int
	if strings.HasPrefix(nt.Ns, UserPrefix) {
		targetMap = nt.UserNameSpaceGroup
	} else {
		targetMap = nt.AdmNamespaceGroup
	}
	cnt := nt.Pos
	var ok = true
	var err error
	nt.RWMutex.RLock()
	for _, notification := range nt.NotificationCache[nt.Pos:] {
		retries := 0
		notificationCopy := notification.DeepCopy()
		notificationCopy.SetNamespace(nt.Ns)
		for {
			if retries > maxRetries {
				ok = false
				break
			}
			if err = client.Create(ctx, notificationCopy, cl.FieldOwner(Namespace)); cl.IgnoreAlreadyExists(err) != nil {
				retries++
				waitTime := time.Duration(math.Pow(2, float64(retries-1))) * time.Second
				time.Sleep(waitTime)
				continue
			}
			break
		}
		cnt++
	}
	nt.RWMutex.RUnlock()
	nt.RWMutex.Lock()
	defer nt.RWMutex.Unlock()
	targetMap[nt.Ns] = cnt
	if ok {
		return nil
	}
	return errors.New("DeliverCR Error: " + "namespace: " + nt.Ns + " err: " + err.Error())
}

func addNamespaceIfMissing(prefix string, targetMap map[string]int, nsName string) {
	if strings.HasPrefix(nsName, prefix) {
		if _, ok := targetMap[nsName]; !ok {
			targetMap[nsName] = 0
		}
	}
}
func resetMapValues(m map[string]int) {
	for k := range m {
		m[k] = 0
	}
}
