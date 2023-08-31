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
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/types"
)

type DataSycn struct {
}

func NewDataSync() *DataSycn {
	return &DataSycn{}
}

type SyncRequest struct {
	UID string `json:"uid"`
}

type SyncResponse struct {
	Config `json:",inline"`
}

type Config struct {
	CollectorURL      string `json:"CollectorURL"`
	NotificationURL   string `json:"NotificationURL"`
	RegisterURL       string `json:"RegisterURL"`
	CloudSyncURL      string `json:"CloudSyncURL"`
	LicenseMonitorURL string `json:"LicenseMonitorURL"`
	// Add other fields here to support future expansion needs.
}

func (d *DataSycn) sync(instance *TaskInstance) error {
	uid, urlMap, err := GetUIDURL(instance.ctx, instance.Client)
	if err != nil {
		instance.logger.Info("failed to get uid and url map")
		return err
	}
	// pull sync data from cloud
	syncRequest := SyncRequest{
		UID: uid,
	}
	body, err := Pull(urlMap[CloudSyncURL], syncRequest)
	if err != nil {
		instance.logger.Info("failed to pull sync data from cloud")
		return err
	}
	var syncResponse map[string]string
	err = Convert(body.Body, &syncResponse)
	if err != nil {
		instance.logger.Info("failed to convert sync response")
		return err
	}
	// update configmap
	err = d.updateConfigMap(instance, syncResponse, types.NamespacedName{
		Namespace: GetOptions().GetEnvOptions().Namespace,
		Name:      URLConfig,
	})

	if err != nil {
		instance.logger.Info("failed to update configmap")
		return err
	}

	return nil
}

func (d *DataSycn) updateConfigMap(instance *TaskInstance, new map[string]string, id types.NamespacedName) error {
	configMap := &corev1.ConfigMap{}
	err := instance.Client.Get(instance.ctx, id, configMap)
	if err != nil {
		instance.logger.Info("failed to get configmap")
		return err
	}
	if IsConfigMapChanged(new, configMap) {
		err = instance.Client.Update(instance.ctx, configMap)
		if err != nil {
			instance.logger.Info("failed to update configmap")
			return err
		}
	}
	return nil
}
