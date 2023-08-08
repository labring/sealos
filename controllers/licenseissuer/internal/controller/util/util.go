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
	"encoding/json"
	"errors"
	"reflect"

	issuer "github.com/labring/sealos/controllers/licenseissuer/internal/manager"
	corev1 "k8s.io/api/core/v1"
)

func GetConfigFromConfigMap(expectName string,
	configMap *corev1.ConfigMap) (map[string]string, error) {
	if configMap.Name != expectName {
		err := errors.New("not expected configmap")
		return nil, err
	}
	var res map[string]string
	err := json.Unmarshal([]byte(configMap.Data["config.json"]), &res)
	if err != nil {
		return nil, err
	}
	return res, nil
}

func ReadConfigFromConfigMap(expectName string, configMap *corev1.ConfigMap) (issuer.Config, error) {
	if configMap.Name != expectName {
		err := errors.New("not expected configmap")
		return issuer.Config{}, err
	}

	var config issuer.Config
	err := json.Unmarshal([]byte(configMap.Data["config.json"]), &config)
	if err != nil {
		return issuer.Config{}, err
	}

	return config, nil
}

func IsConfigMapChanged(expect map[string]string, cm *corev1.ConfigMap) bool {
	var changed bool
	var configMapJSON map[string]string
	if err := json.Unmarshal([]byte(cm.Data["config.json"]), &configMapJSON); err != nil {
		return false
	}
	newConfigMapValue := reflect.ValueOf(expect)
	newConfigMapType := newConfigMapValue.Type()

	for i := 0; i < newConfigMapValue.NumField(); i++ {
		fieldName := newConfigMapType.Field(i).Name
		fieldValue := newConfigMapValue.Field(i).String()

		cmKey := fieldName

		if cmValue, ok := cm.Data[cmKey]; !ok || cmValue != fieldValue {
			configMapJSON[fieldName] = fieldValue
			changed = true
		}
	}
	if changed {
		updatedJSON, err := json.Marshal(configMapJSON)
		if err != nil {
			panic(err)
		}
		cm.Data["config.json"] = string(updatedJSON)
	}

	return changed
}
