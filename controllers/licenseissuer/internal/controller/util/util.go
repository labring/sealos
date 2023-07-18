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
	"sync"

	"github.com/go-logr/logr"
	ntf "github.com/labring/sealos/controllers/common/notification/api/v1"
	cloudv1 "github.com/labring/sealos/controllers/licenseissuer/api/v1"
	cloud "github.com/labring/sealos/controllers/licenseissuer/internal/manager"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/types"
	cl "sigs.k8s.io/controller-runtime/pkg/client"
)

func ReadConfigFromConfigMap(expectName string, configMap *corev1.ConfigMap) (cloud.Config, error) {
	if configMap.Name != expectName {
		err := errors.New("not expected configmap")
		return cloud.Config{}, err
	}

	var config cloud.Config
	err := json.Unmarshal([]byte(configMap.Data["config.json"]), &config)
	if err != nil {
		return cloud.Config{}, err
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

func StartCloudModule(ctx context.Context, client cl.Client) error {
	isMonitor := os.Getenv(string(cloud.IsMonitor))
	if isMonitor == cloud.TRUE {
		var launcher cloudv1.Launcher
		nn := types.NamespacedName{
			Namespace: string(cloud.Namespace),
			Name:      string(cloud.ClientStartName),
		}
		err := client.Get(ctx, nn, &launcher)
		if err == nil {
			launcher.Labels[string(cloud.IsCollector)] = cloud.FALSE
			launcher.Labels[string(cloud.IsSync)] = cloud.FALSE
			launcher.Labels[string(cloud.IsNotification)] = cloud.FALSE
			return client.Update(ctx, &launcher)
		} else if apierrors.IsNotFound(err) {
			launcher.SetName(string(cloud.ClientStartName))
			launcher.SetNamespace(string(cloud.Namespace))
			launcher.Labels = make(map[string]string)
			launcher.Labels[string(cloud.IsCollector)] = cloud.FALSE
			launcher.Labels[string(cloud.IsSync)] = cloud.FALSE
			launcher.Labels[string(cloud.IsNotification)] = cloud.FALSE
			err := client.Create(ctx, &launcher)
			if err != nil {
				return fmt.Errorf("StartCloudModule: %w", err)
			}
			return nil
		}
		return err
	}
	return nil
}

func SubmitNotificationWithUserCategory(ctx context.Context, client cl.Client, logger logr.Logger, users cloud.UserCategory, prefix string, pack cloud.NotificationPackage) {
	notification := cloud.NotificationPackageToNotification(pack)
	var wg sync.WaitGroup
	errchan := make(chan error)
	for ns := range users[prefix].Iter() {
		wg.Add(1)
		notificationTask := cloud.NewNotificationTask(ctx, client, ns, []ntf.Notification{notification})
		go cloud.AsyncCloudTask(&wg, errchan, &notificationTask)
	}
	go func() {
		wg.Wait()
		close(errchan)
	}()
	for err := range errchan {
		if err != nil {
			logger.Error(err, "Failed to deliver registration success.")
		}
	}
}

func SubmitNotificationWithUser(ctx context.Context, client cl.Client, logger logr.Logger, target string, pack cloud.NotificationPackage) {
	notification := cloud.NotificationPackageToNotification(pack)
	notificationTask := cloud.NewNotificationTask(ctx, client, target, []ntf.Notification{notification})
	var wg sync.WaitGroup
	errchan := make(chan error)
	wg.Add(1)
	go cloud.AsyncCloudTask(&wg, errchan, &notificationTask)
	go func() {
		wg.Wait()
		close(errchan)
	}()
	for err := range errchan {
		if err != nil {
			logger.Error(err, "Failed to deliver notification success")
		}
	}
}

func InterfaceToInt64(value interface{}) (int64, error) {
	switch v := value.(type) {
	case int64:
		return v, nil
	case float64:
		return int64(v), nil
	default:
		return 0, errors.New("cannot convert value of type to int64")
	}
}
