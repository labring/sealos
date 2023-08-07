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
	"crypto/rand"
	"encoding/base64"
	"encoding/binary"
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"

	"github.com/go-logr/logr"
	v1 "github.com/labring/sealos/controllers/common/notification/api/v1"
	corev1 "k8s.io/api/core/v1"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type Kind string

const (
	General Kind = "General"
	Admin   Kind = "Admin"
)

const (
	GeneralPrefix = "ns-" // general notification prefix
)

// Filter is a function that takes an object
// and returns true if the object should be included in the result.
type Filter func(obj client.Object) bool

var filters map[string]Filter

var logger logr.Logger

func init() {
	logger = ctrl.Log.WithName("Notice")
	filters = make(map[string]Filter)
	filters[string(General)] = func(obj client.Object) bool {
		return strings.HasPrefix(obj.GetName(), GeneralPrefix)
	}
	filters[string(Admin)] = func(obj client.Object) bool {
		return false
	}
}

const (
	idLength    = 12
	letterBytes = "abcdefghijklmnopqrstuvwxyz0123456789"
)

// Receiver is the struct that contains the notification information.
type Receiver struct {
	context.Context
	client.Client
	UserNamespaces  []string
	AdminNamespaces []string
}

func (rv *Receiver) SetReceiver(receiver string, kind ...Kind) error {
	if len(kind) > 1 {
		return fmt.Errorf("kind parameter cannot exceed 1")
	}
	if len(kind) == 0 {
		rv.UserNamespaces = append(rv.UserNamespaces, receiver)
	}
	switch kind[0] {
	case General:
		rv.UserNamespaces = append(rv.UserNamespaces, receiver)
	case Admin:
		rv.AdminNamespaces = append(rv.AdminNamespaces, receiver)
	}
	return nil
}

// Cache of the NamespaceCache caches the namespaces in the cluster
// categorized by  filters.
func (rv *Receiver) Cache(obj client.ObjectList) error {
	err := rv.Client.List(rv.Context, obj)
	if err != nil {
		logger.Error(err, "Failed to list namespaces")
		return err
	}
	namespaces, ok := obj.(*corev1.NamespaceList)
	if !ok {
		logger.Error(err, "Failed to cast to NamespaceList")
		return fmt.Errorf("failed to cast to NamespaceList: %w", err)
	}
	for _, ns := range namespaces.Items {
		if filters[string(General)](&ns) {
			rv.UserNamespaces = append(rv.UserNamespaces, ns.GetName())
		}
		if filters[string(Admin)](&ns) {
			rv.AdminNamespaces = append(rv.AdminNamespaces, ns.GetName())
		}
	}
	return nil
}

// ReCache of the NamespaceCache caches the namespaces in the cluster
func (rv *Receiver) ReCache(obj client.ObjectList) error {
	rv.UserNamespaces = []string{}
	rv.AdminNamespaces = []string{}
	return rv.Cache(obj)
}

// NotificationPackage is the struct that contains the notification information.
type NoticeEventQueue struct {
	Events []Event
}

// AddToEvents adds the notification to the provided NoticeEventQueue.
func (nb *Builder) AddToEventQueue(neq *NoticeEventQueue) {
	neq.Events = append(neq.Events, Event{
		ID:      RandStrings(idLength),
		Title:   nb.Title,
		From:    nb.From,
		Message: nb.Message,
		Level:   nb.Level,
	})
}

// Event is the struct that contains the notification information.
type Event struct {
	// ID is the unique ID of the notification.
	ID      string
	Title   string
	From    string
	Message string
	Kind    Kind
	Level   v1.Type
}

// Builder is the struct that contains the notification information.
type Builder struct {
	Kind    Kind
	Title   string
	From    string
	Message string
	Level   v1.Type
}

func (nb *Builder) WithTitle(title string) *Builder {
	nb.Title = title
	return nb
}

func (nb *Builder) WithFrom(from string) *Builder {
	nb.From = from
	return nb
}

func (nb *Builder) WithMessage(message string) *Builder {
	nb.Message = message
	return nb
}

func (nb *Builder) WithLevel(Level v1.Type) *Builder {
	nb.Level = Level
	return nb
}

func (nb *Builder) WithType(kind Kind) *Builder {
	nb.Kind = kind
	return nb
}

/*
NewNotificationEvent creates a new NotificationEvent with the provided title, message, kind, sender (from), and optional severity level.

Parameters:
- title: The title of the notification.
- message: The message content of the notification.
- kind: The kind of the notification (e.g., General, Personal, Admin).
- from: The sender of the notification.
- level: The optional severity level of the notification.
- target: An optional parameter specifying the intended recipient(s) of the notification. If provided, the notification will be directed towards these targets.

Return values:
- A NotificationEvent struct populated with the provided values and a unique ID generated for this notification.
- An error object if the provided level exceeds 1, in which case an error message "level parameter cannot exceed 1" will be returned.

The function also generates a unique ID for each NotificationEvent. If the generation of the ID fails, it uses the current Unix timestamp as the ID.
*/
func NewNotificationEvent(title string, message string,
	kind Kind, from string, level v1.Type) Event {

	id, err := randStringBytes(idLength)
	if err != nil || id == "" {
		id = strings.ToLower(strconv.Itoa(int(time.Now().Unix())))
	}

	return Event{
		ID:      id,
		Title:   title,
		Message: message,
		From:    from,
		Kind:    kind,
		Level:   level,
	}
}

func RandStrings(n int) string {
	str, err := randStringBytes(idLength)
	if err != nil || str == "" {
		str = encodeTime()
	}
	return str
}

func randStringBytes(n int) (string, error) {
	bytes := make([]byte, n)
	if _, err := io.ReadFull(rand.Reader, bytes); err != nil {
		return "", err
	}
	for i, b := range bytes {
		bytes[i] = letterBytes[b%byte(len(letterBytes))]
	}
	return string(bytes), nil
}

// encodeTime encodes current Unix timestamp to a base64 string
func encodeTime() string {
	current := time.Now().Unix()
	buf := make([]byte, 8)
	binary.BigEndian.PutUint64(buf, uint64(current))
	return base64.StdEncoding.EncodeToString(buf)
}
