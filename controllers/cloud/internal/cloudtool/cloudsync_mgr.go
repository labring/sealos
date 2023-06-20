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
	"reflect"

	v1 "github.com/labring/sealos/controllers/cloud/api/v1"
	"github.com/labring/sealos/pkg/utils/logger"
	corev1 "k8s.io/api/core/v1"
	cl "sigs.k8s.io/controller-runtime/pkg/client"
)

const (
	RegisterURL     string = "RegisterURL"
	NotificationURL string = "NotificationURL"
	CollectorURL    string = "CollectorURL"
	CloudSyncURL    string = "CloudSyncURL"
)

type URL struct {
	RegisterURL     string `json:"registerURL"`
	NotificationURL string `json:"notificationURL"`
	CollectorURL    string `json:"collectorURL"`
	CloudSyncURL    string `json:"cloudsyncURL"`
}
type CloudSyncInfo struct {
	CloudURL  URL     `json:"urls"`
	Policy    Policy  `json:"policy"`
	License   License `json:"license"`
	PublicKey string  `json:"publicKey"`
}

type CloudSyncManager struct {
	Client cl.Client
	Info   CloudSyncInfo
}

func (cs *CloudSyncManager) Update(client cl.Client, arg cl.Object, ctx context.Context, callback func(cl.Object) bool) bool {
	if ok := callback(arg); !ok {
		return true
	}
	if ok := UpdateImportantResource(client, cs, ctx, arg); !ok {
		return false
	}
	return true
}

func (cs *CloudSyncManager) Receiver(body []byte) error {
	if err := json.Unmarshal(body, &cs.Info); err != nil {
		logger.Error("failed to parse the cloudsync info", err)
		return err
	}
	return nil
}

func (cs *CloudSyncManager) ChooseCompareCallBack(val cl.Object) bool {
	switch v := val.(type) {
	case *v1.License:
		return IsLicenseChanged(cs, v)
	case *corev1.ConfigMap:
		return IsConfigMapChanged(cs, v)
	case *corev1.Secret:
		return IsSecretChanged(cs, v)
	}
	return false
}

func IsLicenseChanged(cs *CloudSyncManager, ls *v1.License) bool {
	var changed bool = false
	if ls.Spec.Policy != cs.Info.Policy.LicensePolicy {
		ls.Spec.Policy = cs.Info.Policy.LicensePolicy
		changed = true
	}
	if ls.Spec.Token != cs.Info.License.Token {
		ls.Spec.Token = cs.Info.License.Token
		changed = true
	}
	if ls.Spec.Key != cs.Info.PublicKey {
		ls.Spec.Key = cs.Info.PublicKey
		changed = true
	}
	return changed
}

func IsSecretChanged(cs *CloudSyncManager, sc *corev1.Secret) bool {
	var changed bool = false
	fieldNameValueMap := map[string]string{
		"token": cs.Info.License.Token,
		"key":   cs.Info.PublicKey,
	}
	for scKey, scNewValue := range fieldNameValueMap {
		if scValue, ok := sc.Data[scKey]; !ok || string(scValue) != scNewValue {
			sc.Data[scKey] = []byte(scNewValue)
			changed = true
		}
	}
	return changed
}

func IsConfigMapChanged(cs *CloudSyncManager, cm *corev1.ConfigMap) bool {
	var changed bool = false
	var configMapJson map[string]string
	if err := json.Unmarshal([]byte(cm.Data["config.json"]), &configMapJson); err != nil {
		panic(err)
	}
	newConfigMapValue := reflect.ValueOf(cs.Info.CloudURL)
	newConfigMapType := newConfigMapValue.Type()

	for i := 0; i < newConfigMapValue.NumField(); i++ {
		fieldName := newConfigMapType.Field(i).Name
		fieldValue := newConfigMapValue.Field(i).String()

		cmKey := fieldName

		if cmValue, ok := cm.Data[cmKey]; !ok || cmValue != fieldValue {
			configMapJson[fieldName] = fieldValue
			changed = true
		}
	}
	if changed {
		updatedJson, err := json.Marshal(configMapJson)
		if err != nil {
			panic(err)
		}
		cm.Data["config.json"] = string(updatedJson)
	}

	return changed
}

func (cs *CloudSyncManager) Reset() {
	cs.Info.CloudURL = URL{}
	cs.Info.License = License{}
	cs.Info.Policy = Policy{}
}
