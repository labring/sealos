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
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"os"

	issuerv1 "github.com/labring/sealos/controllers/licenseissuer/api/v1"
	issuer "github.com/labring/sealos/controllers/licenseissuer/internal/manager"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/types"
	cl "sigs.k8s.io/controller-runtime/pkg/client"
)

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

func Register() (string, error) {
	return newUUID()
}

func newUUID() (string, error) {
	uuid := make([]byte, 16)
	n, err := rand.Read(uuid)
	if n != len(uuid) || err != nil {
		return "", err
	}
	uuid[6] = (uuid[6] & 0x0f) | 0x40
	uuid[8] = (uuid[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", uuid[0:4], uuid[4:6], uuid[6:8], uuid[8:10], uuid[10:]), nil
}

// StartCloudModule is a function that initializes a cloud module in a cloud-native environment.
// The function checks if the current environment is set as a monitor. If it is, the function
// locates a launcher by its namespaced name. If the launcher does not exist, the function creates
// a new launcher with the necessary labels and attempts to create it in the client's context.
// If the launcher already exists, the function updates the launcher's labels and attempts to
// update it in the client's context. If there are any errors during these operations, the function
// wraps them with a contextual message and returns them. If the environment is not set as a monitor,
// or if the operations are successful, the function returns nil.
func StartCloudModule(ctx context.Context, client cl.Client) error {
	isMonitor := os.Getenv(string(issuer.IsMonitor))
	if isMonitor == issuer.TRUE {
		nn := types.NamespacedName{
			Namespace: string(issuer.Namespace),
			Name:      string(issuer.ClientStartName),
		}

		var launcher issuerv1.Launcher
		err := client.Get(ctx, nn, &launcher)
		if err != nil && apierrors.IsNotFound(err) {
			return createLauncher(ctx, client, nn, &launcher)
		}

		if err != nil {
			return fmt.Errorf("StartCloudModule: %w", err)
		}

		return updateLauncher(ctx, client, &launcher)
	}
	return nil
}

var launchData = map[string]string{
	string(issuer.CollectorLable):    issuer.FALSE,
	string(issuer.SyncLable):         issuer.FALSE,
	string(issuer.NotificationLable): issuer.FALSE,
}

func createLauncher(ctx context.Context, client cl.Client, nn types.NamespacedName, launcher *issuerv1.Launcher) error {
	launcher.SetName(nn.Name)
	launcher.SetNamespace(nn.Namespace)
	launcher.Labels = launchData
	if err := client.Create(ctx, launcher); err != nil {
		return fmt.Errorf("StartCloudModule: %w", err)
	}
	return nil
}

func updateLauncher(ctx context.Context, client cl.Client, launcher *issuerv1.Launcher) error {
	launcher.Labels = launchData
	if err := client.Update(ctx, launcher); err != nil {
		return fmt.Errorf("StartCloudModule: %w", err)
	}
	return nil
}
