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
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/go-logr/logr"
	cloudv1 "github.com/labring/sealos/controllers/cloud/api/v1"
	cloud "github.com/labring/sealos/controllers/cloud/internal/manager"
	ntf "github.com/labring/sealos/controllers/common/notification/api/v1"
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

// ----------------------------------------------------------------------------------------------------------//

type RegisterAndStartData struct {
	logger       logr.Logger
	Users        cloud.UserCategory
	ctx          context.Context
	client       cl.Client
	FreeLicense  cloud.License
	clusterScret *corev1.Secret
	config       cloud.Config
}

func NewRegisterAndStartData(ctx context.Context, client cl.Client, clusterScret *corev1.Secret,
	users cloud.UserCategory, config cloud.Config, logger logr.Logger) RegisterAndStartData {
	return RegisterAndStartData{
		ctx:          ctx,
		client:       client,
		clusterScret: clusterScret,
		config:       config,
		logger:       logger,
		Users:        users,
	}
}

// ----------------------------------------------------------------------------------------------------------//

type RegisterAndStartCallBack func(data RegisterAndStartData) error

func RegisterAndStart(data RegisterAndStartData) error {
	value, ok := data.clusterScret.Labels["registered"]
	if !ok {
		return fmt.Errorf("RegisterAndStart: the Yaml of cloud secret if error, less registered label")
	}
	if value != cloud.TRUE {
		err := data.Register()
		if err != nil {
			return fmt.Errorf("RegisterAndStart: %w", err)
		}
		pack := cloud.NewNotificationPackage(cloud.RegistrationSuccessTitle, cloud.SEALOS, cloud.RegistrationSuccessContent)
		SubmitNotificationWithUserCategory(data.ctx, data.client, data.logger, data.Users, cloud.AdmPrefix, pack)
	}
	err := data.StartCloudModule()
	if err != nil {
		return fmt.Errorf("RegisterAndStart: %w", err)
	}
	return nil
}

func (rd *RegisterAndStartData) Register() error {
	url := rd.config.RegisterURL
	// get&store the cluster info
	httpbody, err := cloud.CommunicateWithCloud("GET", url, nil)
	if err != nil {
		return fmt.Errorf("Register: %w", err)
	}
	if !cloud.IsSuccessfulStatusCode(httpbody.StatusCode) {
		return fmt.Errorf("Register: %s", http.StatusText(httpbody.StatusCode))
	}
	var clusterInfo cloud.ClusterInfo
	err = cloud.Convert(httpbody.Body, &clusterInfo)
	if err != nil {
		return fmt.Errorf("Register: %w", err)
	}
	if rd.clusterScret.Data == nil {
		rd.clusterScret.Data = make(map[string][]byte)
	}
	rd.clusterScret.Data["key"] = []byte(clusterInfo.Key)
	rd.clusterScret.Data["uid"] = []byte(clusterInfo.UID)
	rd.clusterScret.Labels["registered"] = cloud.TRUE
	// send a notification to cluster adm

	err = rd.client.Update(rd.ctx, rd.clusterScret)
	if err != nil {
		return fmt.Errorf("Register: client.Update: %w", err)
	}
	return nil
}

func (rd *RegisterAndStartData) StartCloudModule() error {
	if err := rd.StartLauncher(); err != nil {
		return fmt.Errorf("startLauncher: %w", err)
	}
	return nil
}

func (rd *RegisterAndStartData) StartLauncher() error {
	var startInstance cloudv1.Launcher
	startInstance.SetName(string(cloud.ClientStartName))
	startInstance.SetNamespace(string(cloud.Namespace))
	if err := rd.client.Get(rd.ctx, types.NamespacedName{Namespace: string(cloud.Namespace), Name: string(cloud.ClientStartName)}, &startInstance); err != nil {
		if apierrors.IsNotFound(err) {
			startInstance.Labels = make(map[string]string)
			startInstance.Labels[string(cloud.IsRead)] = cloud.FALSE
			startInstance.Labels[string(cloud.ExternalNetworkAccessLabel)] = string(cloud.Enabled)
			if err := rd.client.Create(rd.ctx, &startInstance); err != nil {
				return fmt.Errorf("startLauncher: client.Create: %w", err)
			}
		} else {
			return fmt.Errorf("startLauncher: client.Get: %w", err)
		}
	} else {
		if startInstance.Labels == nil {
			startInstance.Labels = make(map[string]string)
		}
		startInstance.Labels[string(cloud.IsRead)] = cloud.FALSE
		startInstance.Labels[string(cloud.ExternalNetworkAccessLabel)] = string(cloud.Enabled)
		if err := rd.client.Update(rd.ctx, &startInstance); err != nil {
			return fmt.Errorf("startLauncher: client.Update: %w", err)
		}
	}
	time.Sleep(time.Millisecond * 10000)
	if startInstance.Labels == nil {
		startInstance.Labels = make(map[string]string)
	}
	startInstance.Labels[string(cloud.IsRead)] = cloud.TRUE
	if err := rd.client.Update(rd.ctx, &startInstance); err != nil {
		return fmt.Errorf("startLauncher: client.Update: %w", err)
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

func SubmitLicense(ctx context.Context, client cl.Client, cluster corev1.Secret) error {
	var license cloudv1.License
	err := client.Get(ctx, types.NamespacedName{Namespace: string(cloud.Namespace), Name: string(cloud.LicenseName)}, &license)
	if err != nil {
		if apierrors.IsNotFound(err) {
			license.SetName(string(cloud.LicenseName))
			license.SetNamespace(string(cloud.Namespace))
			license.Spec.Token = string(cluster.Data["token"])
			license.Spec.Key = string(cluster.Data["key"])
			if license.Labels == nil {
				license.Labels = make(map[string]string)
			}
			license.Labels["isRead"] = cloud.FALSE
			err := client.Create(ctx, &license)
			if err == nil {
				return nil
			}
		}
	} else {
		license.SetName(string(cloud.LicenseName))
		license.SetNamespace(string(cloud.Namespace))
		license.Spec.Token = string(cluster.Data["token"])
		license.Spec.Key = string(cluster.Data["key"])
		if license.Labels == nil {
			license.Labels = make(map[string]string)
		}
		license.Labels["isRead"] = cloud.FALSE
		err := client.Update(ctx, &license)
		if err == nil {
			return nil
		}
	}
	return nil
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

func GetNextLicenseKeySuffix(data map[string]string) int {
	maxSuffix := 0

	for key := range data {
		var currentSuffix int
		_, err := fmt.Sscanf(key, "license-%d", &currentSuffix)
		if err == nil && currentSuffix > maxSuffix {
			maxSuffix = currentSuffix
		}
	}

	return maxSuffix + 1
}

func CheckLicenseExists(configMap *corev1.ConfigMap, license string) bool {
	for _, storedLicense := range configMap.Data {
		if storedLicense == license {
			return true
		}
	}

	return false
}
