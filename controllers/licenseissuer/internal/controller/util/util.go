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
	"encoding/json"
	"errors"

	issuerv1 "github.com/labring/sealos/controllers/licenseissuer/api/v1"
	"github.com/labring/sealos/controllers/pkg/crypto"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
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

func IsConfigMapChanged(expect map[string]string, cm *corev1.ConfigMap) bool {
	var changed bool
	var configMapJSON map[string]string
	if err := json.Unmarshal([]byte(cm.Data["config.json"]), &configMapJSON); err != nil {
		return false
	}
	for key, value := range expect {
		if cmValue, ok := cm.Data[key]; !ok || cmValue != value {
			configMapJSON[key] = value
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

func AccumulateUsage(ctx context.Context, client client.Client, usage int64) error {
	id := types.NamespacedName{
		Name:      ScaleBilling,
		Namespace: GetOptions().GetEnvOptions().Namespace,
	}
	csb := &issuerv1.ClusterScaleBilling{}
	err := client.Get(ctx, id, csb)
	if err != nil {
		return err
	}

	decryptUsed, err := crypto.DecryptInt64WithKey(csb.Status.EncryptUsed, []byte(CryptoKey))
	if err != nil {
		return err
	}
	encryptUsed, err := crypto.EncryptInt64WithKey(decryptUsed+usage, []byte(CryptoKey))
	if err != nil {
		return err
	}
	csb.Status.EncryptUsed = *encryptUsed
	csb.Status.Used = decryptUsed + usage

	return client.Status().Update(ctx, csb)
}
