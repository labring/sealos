/*
Copyright 2023 yxxchange@163.com.

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
package cloudtool

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	ntf "github.com/labring/sealos/controllers/common/notification/api/v1"
	"github.com/labring/sealos/pkg/utils/logger"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/types"
	cl "sigs.k8s.io/controller-runtime/pkg/client"
)

type CloudSubmit interface {
	getNameNamespace() (interface{}, error)
	//response
	convert([]byte) (interface{}, error)
	produceCR(interface{}, interface{}) (interface{}, error)
	submitCR(interface{}) error
}

func CloudCreateCR(h CloudSubmit, resp []byte) error {
	namespaceGroup, err := h.getNameNamespace()
	if err != nil {
		return err
	}
	events, err := h.convert(resp)
	if err != nil {
		return err
	}
	CRs, err := h.produceCR(namespaceGroup, events)
	if err != nil {
		return err
	}

	return h.submitCR(CRs)
}

// data struct from cloud
type NotificationResponse struct {
	ID string `json:"_id"`
	ntf.NotificationSpec
}

// data stuct to cloud
type NotificationRequest struct {
	Timestamp int64 `json:"Timestamp"`
}

type NotificationManager struct {
	timestamp int64
	client    cl.Client
}

type handlerFunc func(*NotificationManager, *ntf.Notification, string, NotificationResponse)

var handlerMap = map[string]handlerFunc{
	"ns-":  (*NotificationManager).processNS,
	"adm-": (*NotificationManager).processADM,
}

func (nm *NotificationManager) convert(resp []byte) (interface{}, error) {
	var events []NotificationResponse
	if err := json.Unmarshal(resp, &events); err != nil {
		logger.Info("failed to decode the json string ", "Error: ", err)
		return nil, err
	}
	return events, nil
}

// produce the crs data
func (nm *NotificationManager) produceCR(material interface{}, cloud_resp interface{}) (interface{}, error) {
	var events []NotificationResponse
	var ok bool
	var crs []ntf.Notification
	var namespaceGroup map[string][]string

	if namespaceGroup, ok = material.(map[string][]string); !ok {
		logger.Error("error type, expected map[string][]stringe")
		return nil, errors.New("error type, expected map[string][]stringe")
	}

	if events, ok = cloud_resp.([]NotificationResponse); !ok {
		logger.Error("error type, expected []CloudResponse")
		return nil, errors.New("error type, expected []CloudResponse")
	}

	for _, event := range events {
		if event.Timestamp > nm.timestamp {
			nm.timestamp = event.Timestamp
		}
		for prefix, namespaces := range namespaceGroup {
			nm.buildCR(prefix, namespaces, event, &crs)
		}
	}
	return crs, nil
}

func (nm *NotificationManager) buildCR(prefix string, namespaces []string, event NotificationResponse, crs *[]ntf.Notification) {
	addNameNamespace := handlerMap[prefix]
	for _, namespace := range namespaces {
		if namespace == "" {
			logger.Error("empty namespace")
		}
		var Ntf ntf.Notification
		specCopy(&Ntf, event)
		addNameNamespace(nm, &Ntf, namespace, event)
		*crs = append(*crs, Ntf)
	}
}

func (nm *NotificationManager) getNameNamespace() (interface{}, error) {
	return nm.getNamespaceGroup(nm.client)
}

func (nm *NotificationManager) getNamespaceGroup(client cl.Client) (map[string][]string, error) {
	namespaceList := &corev1.NamespaceList{}
	if err := client.List(context.Background(), namespaceList); err != nil {
		logger.Error("failed to get namespace resource ", err)
		return map[string][]string{}, err
	}
	//divide namespace to diff groups
	var namespaceGroup = map[string][]string{
		"ns-":  {},
		"adm-": {},
	}
	for _, namespace := range namespaceList.Items {
		for prefix := range namespaceGroup {
			if strings.HasPrefix(namespace.Name, prefix) {
				namespaceGroup[prefix] = append(namespaceGroup[prefix], namespace.Name)
				break
			}
		}
	}
	return namespaceGroup, nil
}

func (nm *NotificationManager) submitCR(crs interface{}) error {
	var CRs []ntf.Notification
	var ok bool
	var err error
	if CRs, ok = crs.([]ntf.Notification); !ok {
		logger.Error("error type, expected []ntf.Notification")
	}
	for _, res := range CRs {
		var tmp ntf.Notification
		key := types.NamespacedName{Namespace: res.Namespace, Name: res.Name}
		if err = nm.client.Get(context.Background(), key, &tmp); err == nil {
			res.ResourceVersion = tmp.ResourceVersion
			if err = nm.client.Update(context.Background(), &res); err != nil {
				logger.Info("failed to create ", "user_id: ", res.Namespace, "notification id: ", res.Name, "Error: ", err)
			}
		} else {
			if cl.IgnoreNotFound(err) == nil {
				if err = nm.client.Create(context.Background(), &res); err != nil {
					logger.Info("failed to create ", "user_id: ", res.Namespace, "notification id: ", res.Name, "Error: ", err)
				}
			} else {
				logger.Error("failed to create ", "user_id: ", res.Namespace, "notification id: ", res.Name, "Error: ", err)
			}
		}
	}
	return nil
}

func specCopy(notification *ntf.Notification, event NotificationResponse) {
	notification.Spec.From = "Sealos Cloud"
	notification.Spec.Message = event.Message
	notification.Spec.Title = event.Title
	notification.Spec.Timestamp = event.Timestamp
	notification.Spec.Importance = event.Importance
}

func (nm *NotificationManager) processNS(notification *ntf.Notification, namespaceName string, event NotificationResponse) {
	prefix := "ntf-"
	//metadata
	notification.Namespace = namespaceName
	notification.Name = prefix + event.ID
}
func (nm *NotificationManager) processADM(notification *ntf.Notification, namespaceName string, event NotificationResponse) {
	prefix := "ntf-"
	//metadata
	notification.Namespace = namespaceName
	notification.Name = prefix + event.ID
}

func (nm *NotificationManager) SetTime(time int64) {
	nm.timestamp = time
}

func (nm *NotificationManager) SetClient(client cl.Client) {
	nm.client = client
}

func GetTime(nm *NotificationManager) int64 {
	return nm.timestamp
}
