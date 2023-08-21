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
	"fmt"

	"github.com/google/uuid"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/types"
)

const MaxRetryForConnectDB = 5

type RegisterRequest struct {
	UID string `json:"uid"`
}

// The following code is used to implement the instance of sub-task which is used to
// initialize the cluster uuid and preset root user for mongoDB
type initTask struct {
	options Options
}

func (t initTask) initWork(instance *TaskInstance) error {
	err := t.register(instance)
	if err != nil {
		instance.logger.Error(err, "failed to register")
		return err
	}
	return nil
}

// 1. check if the cluster has been registered
// 2. register to cloud (if the monitor is enabled)
// 3. store cluster-info to k8s

func (t initTask) register(instance *TaskInstance) error {
	ClusterInfo := createClusterInfo()
	// step 1
	// check if the cluster has been registered
	registered, err := t.checkRegister(instance)
	if err != nil {
		instance.logger.Error(err, "failed to check register")
		return err
	}
	if registered {
		instance.logger.Info("cluster has been registered")
		return nil
	}

	// step 2
	// if the monitor is enabled, info will be sent to the cloud.
	if t.options.GetEnvOptions().MonitorConfiguration == "true" {
		err := t.registerToCloud(*ClusterInfo, instance)
		if err != nil {
			instance.logger.Error(err, "failed to register to cloud")
			return err
		}
	}
	// step 3
	// only after register to cloud, the store-behavior will be executed.
	err = instance.Create(instance.ctx, ClusterInfo)
	if err != nil {
		instance.logger.Error(err, "failed to create cluster-info")
	}
	return err
}

// check if the cluster has been registered.
func (t initTask) checkRegister(instance *TaskInstance) (bool, error) {
	info := &corev1.Secret{}
	err := instance.Get(instance.ctx, types.NamespacedName{
		Name:      ClusterInfo,
		Namespace: GetOptions().GetEnvOptions().Namespace,
	}, info)
	if err != nil && apierrors.IsNotFound(err) {
		return false, nil
	}
	return true, err
}

// registerToCloud is used to send info to the cloud.
func (t initTask) registerToCloud(ClusterInfo corev1.Secret, instance *TaskInstance) error {
	urlMap, err := GetURL(instance.ctx, instance.Client)
	if err != nil {
		return fmt.Errorf("failed to get url: %w", err)
	}
	rr := RegisterRequest{
		UID: string(ClusterInfo.Data["uuid"]),
	}
	// send info to cloud
	err = Push(urlMap[RegisterURL], rr)
	if err != nil {
		return fmt.Errorf("failed to write to cloud: %w", err)
	}
	return nil
}

func createClusterInfo() *corev1.Secret {
	uuid := uuid.New().String()
	secret := &corev1.Secret{}
	secret.Name = ClusterInfo
	secret.Namespace = GetOptions().GetEnvOptions().Namespace
	secret.Data = map[string][]byte{
		"uuid": []byte(uuid),
	}
	return secret
}
