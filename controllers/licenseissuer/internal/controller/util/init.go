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
	"sync"

	"github.com/google/uuid"
	issuerv1 "github.com/labring/sealos/controllers/licenseissuer/api/v1"
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
type InitTask struct {
	options OptionsReadOnly
	probe   InitProbe
}

func NewInitTask(o OptionsReadOnly) *InitTask {
	return &InitTask{
		options: o,
		probe:   GetInitProbe(),
	}
}

func (t *InitTask) initWork(instance *TaskInstance) error {
	err := initClusterScaleBilling(instance)
	if err != nil {
		instance.logger.Info("failed to init cluster scale billing", "err", err)
		return err
	}
	// register function is idempotent
	err = t.register(instance)
	if err != nil {
		instance.logger.Info("failed to register", "err", err)
		return err
	}
	t.probe.Completed()
	return nil
}

// 1. check if the cluster has been registered
// 2. store cluster-info to k8s

func (t *InitTask) register(instance *TaskInstance) error {
	ClusterInfo := createClusterInfo()
	// step 1
	// check if the cluster has been registered
	registered, err := t.checkRegister(instance)
	if err != nil {
		instance.logger.Info("failed to check if the cluster has been registered")
		return err
	}
	if registered {
		instance.logger.Info("cluster has been registered")
		return nil
	}

	// step 2
	// only after register to cloud, the store-behavior will be executed.
	err = instance.Create(instance.ctx, ClusterInfo)
	if err != nil {
		instance.logger.Info("failed to store cluster info", "err", err)
	}
	return err
}

// check if the cluster has been registered.
func (t *InitTask) checkRegister(instance *TaskInstance) (bool, error) {
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

func initClusterScaleBilling(instance *TaskInstance) error {
	// step 1
	ok, err := checkClusterScaleBilling(instance)
	if err != nil {
		instance.logger.Info("failed to check if the cluster has been registered")
		return err
	}
	if ok {
		instance.logger.Info("cluster-scale-billing has been created")
		return nil
	}
	csb := createClusterScaleBilling()
	err = instance.Create(instance.ctx, csb)
	if err != nil {
		instance.logger.Info("failed to store cluster info", "err", err)
	}
	return err
}

func checkClusterScaleBilling(instance *TaskInstance) (bool, error) {
	csb := &issuerv1.ClusterScaleBilling{}
	err := instance.Get(instance.ctx, types.NamespacedName{
		Name:      ScaleBilling,
		Namespace: GetOptions().GetEnvOptions().Namespace,
	}, csb)

	if err != nil && apierrors.IsNotFound(err) {
		return false, nil
	}
	return true, err
}

func createClusterScaleBilling() *issuerv1.ClusterScaleBilling {
	csb := &issuerv1.ClusterScaleBilling{}
	csb.Name = ScaleBilling
	csb.Namespace = GetOptions().GetEnvOptions().Namespace
	return csb
}

var onceForInit sync.Once
var flag Flag
var _ InitProbe = &Flag{}
var _ Probe = &Flag{}

type InitProbe interface {
	Probe
	Completed()
}

type Flag struct {
	flag bool
}

func (f *Flag) Completed() {
	f.flag = true
}

func (f *Flag) Probe() bool {
	return f.flag
}

func GetInitProbe() InitProbe {
	onceForInit.Do(func() {
		flag.flag = false
	})
	return &flag
}

func ProbeForInit() Probe {
	return GetInitProbe()
}
