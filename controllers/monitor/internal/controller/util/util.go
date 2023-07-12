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
	"time"

	"github.com/go-logr/logr"
	ntf "github.com/labring/sealos/controllers/common/notification/api/v1"
	cloudv1 "github.com/labring/sealos/controllers/monitor/api/v1"
	cloud "github.com/labring/sealos/controllers/monitor/internal/manager"
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

type Operation interface {
	Execute() error
}

type ReadOperationList struct {
	readOperations []Operation
}

type WriteOperationList struct {
	writeOperations []Operation
}

type ReWriteOperationList struct {
	reWriteOperations []Operation
}

func (list *ReWriteOperationList) AddToList(op Operation) {
	list.reWriteOperations = append(list.reWriteOperations, op)
}

func (list *ReWriteOperationList) Execute() error {
	retryInterval := time.Second * 5 // Retry every 5 seconds
	timeout := time.Minute * 3       // Stop retrying after 3 minutes

	startTime := time.Now()
	for {
		remainingOps := []Operation{}

		for _, op := range list.reWriteOperations {
			err := op.Execute()
			if err != nil {
				remainingOps = append(remainingOps, op)
			}
		}

		if len(remainingOps) == 0 {
			break
		}

		// Update the list of reWriteOperations with the remaining operations
		list.reWriteOperations = remainingOps

		// Check if the timeout has been reached
		if time.Since(startTime) >= timeout {
			return fmt.Errorf("timeout reached, some operations still failed")
		}

		// Wait for the retry interval before trying again
		time.Sleep(retryInterval)
	}

	return nil
}

func (list *ReadOperationList) Execute() error {
	for _, op := range list.readOperations {
		err := op.Execute()
		if err != nil {
			return err
		}
	}
	return nil
}

func (list *WriteOperationList) Execute() error {
	reWriteList := &ReWriteOperationList{}
	errorOccurred := false

	for _, op := range list.writeOperations {
		if errorOccurred {
			reWriteList.AddToList(op)
			continue
		}
		err := op.Execute()
		if err != nil {
			errorOccurred = true
			reWriteList.AddToList(op)
		}
	}

	if errorOccurred {
		err := reWriteList.Execute()
		if err != nil {
			return fmt.Errorf("an error occurred, some operations still failed after retries: %v", err)
		}
	}

	return nil
}

type ReadEventBuilder struct {
	obj      cl.Object
	ctx      context.Context
	client   cl.Client
	tag      types.NamespacedName
	callback WriteFunc
}

type WriteEventBuilder struct {
	obj      cl.Object
	ctx      context.Context
	client   cl.Client
	callback WriteFunc
}

type WriteFunc func(ctx context.Context, client cl.Client, obj cl.Object) error

func (reb *ReadEventBuilder) WithClient(client cl.Client) *ReadEventBuilder {
	reb.client = client
	return reb
}

func (reb *ReadEventBuilder) WithContext(ctx context.Context) *ReadEventBuilder {
	reb.ctx = ctx
	return reb
}

func (reb *ReadEventBuilder) WithObject(obj cl.Object) *ReadEventBuilder {
	reb.obj = obj
	return reb
}
func (reb *ReadEventBuilder) WithCallback(callback WriteFunc) *ReadEventBuilder {
	reb.callback = callback
	return reb
}

func (reb *ReadEventBuilder) WithTag(tag types.NamespacedName) *ReadEventBuilder {
	reb.tag = tag
	return reb
}

func (reb *ReadEventBuilder) Read() error {
	err := reb.client.Get(reb.ctx, reb.tag, reb.obj)
	if err != nil && reb.callback != nil {
		reb.obj.SetName(reb.tag.Name)
		reb.obj.SetNamespace(reb.tag.Namespace)
		return reb.callback(reb.ctx, reb.client, reb.obj)
	}
	return err
}

func (reb *ReadEventBuilder) AddToList(list *ReadOperationList) *ReadOperationList {
	list.readOperations = append(list.readOperations, reb)
	return list
}

func (reb *ReadEventBuilder) Execute() error {
	if reb != nil {
		return reb.Read()
	}
	return fmt.Errorf("ReadEventBuilder excute error: %s", "value can't be nil")
}

func (web *WriteEventBuilder) WithClient(client cl.Client) *WriteEventBuilder {
	web.client = client
	return web
}

func (web *WriteEventBuilder) WithContext(ctx context.Context) *WriteEventBuilder {
	web.ctx = ctx
	return web
}

func (web *WriteEventBuilder) WithObject(obj cl.Object) *WriteEventBuilder {
	web.obj = obj
	return web
}

func (web *WriteEventBuilder) WithCallback(callback WriteFunc) *WriteEventBuilder {
	web.callback = callback
	return web
}

func (web *WriteEventBuilder) Write() error {
	return web.callback(web.ctx, web.client, web.obj)
}

func (web *WriteEventBuilder) Execute() error {
	if web != nil {
		return web.Write()
	}
	return fmt.Errorf("WriteEventBuilder excute error: %s", "value can't be nil")
}

func (reb *WriteEventBuilder) AddToList(list *ReadOperationList) *ReadOperationList {
	list.readOperations = append(list.readOperations, reb)
	return list
}
