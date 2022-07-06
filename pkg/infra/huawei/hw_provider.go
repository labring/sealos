// Copyright © 2021 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package huawei

import (
	"fmt"

	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/rand"

	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/auth/basic"
	ecs "github.com/huaweicloud/huaweicloud-sdk-go-v3/services/ecs/v2"
	vpc "github.com/huaweicloud/huaweicloud-sdk-go-v3/services/vpc/v2"
	"k8s.io/apimachinery/pkg/util/validation/field"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

type ActionName string

const (
	CreateVPC           ActionName = "CreateVPC"
	CreateVSwitch       ActionName = "CreateVSwitch"
	CreateSecurityGroup ActionName = "CreateSecurityGroup"
	ReconcileInstance   ActionName = "ReconcileInstance"
	BindEIP             ActionName = "BindEIP"
	ReleaseEIP          ActionName = "ReleaseEIP"
	ClearInstances      ActionName = "ClearInstances"
	DeleteVSwitch       ActionName = "DeleteVSwitch"
	DeleteSecurityGroup ActionName = "DeleteSecurityGroup"
	DeleteVPC           ActionName = "DeleteVPC"
	GetZoneID           ActionName = "GetAvailableZoneID"
)

type HwProvider struct {
	EcsClient ecs.EcsClient
	VpcClient vpc.VpcClient
	Infra     *v2.Infra
}

type HwFunc func() error

func (a *HwProvider) ReconcileResource(resourceKey ResourceName, action HwFunc) error {
	if resourceKey.Value(a.Infra.Status) != "" {
		logger.Debug("using resource status value %s: %s", resourceKey, resourceKey.Value(a.Infra.Status))
		return nil
	}
	if err := action(); err != nil {
		logger.Error("reconcile resource %s failed err: %s", resourceKey, err)
		return err
	}
	if resourceKey.Value(a.Infra.Status) != "" {
		logger.Info("create resource success %s: %s", resourceKey, resourceKey.Value(a.Infra.Status))
	}
	return nil
}

func (a *HwProvider) DeleteResource(resourceKey ResourceName, action HwFunc) {
	val := resourceKey.Value(a.Infra.Status)
	if val == "" {
		logger.Warn("delete resource not exists %s", resourceKey)
		return
	}
	if err := action(); err != nil {
		logger.Error("delete resource %s failed err: %s", resourceKey, err)
	} else {
		logger.Info("delete resource Success %s: %s", resourceKey, val)
	}
}

var RecocileFuncMap = map[ActionName]func(provider *HwProvider) error{
	CreateVPC: func(hwProvider *HwProvider) error {
		return hwProvider.ReconcileResource(VpcID, hwProvider.CreateVPC)
	},

	//CreateVSwitch: func(hwProvider *HwProvider) error {
	//	return hwProvider.ReconcileResource(VSwitchID, hwProvider.CreateVSwitch)
	//},
	//CreateSecurityGroup: func(hwProvider *HwProvider) error {
	//	return hwProvider.ReconcileResource(SecurityGroupID, hwProvider.CreateSecurityGroup)
	//},
	//ReconcileInstance: func(hwProvider *HwProvider) error {
	//	var errorMsg []string
	//	current := sets.NewString()
	//	spec := sets.NewString()
	//	for _, h := range hwProvider.Infra.Status.Hosts {
	//		current.Insert(strings.Join(h.Roles, ","))
	//	}
	//	for _, h := range hwProvider.Infra.Spec.Hosts {
	//		spec.Insert(strings.Join(h.Roles, ","))
	//		host := &h
	//		statusIndex := hwProvider.Infra.Status.FindHostsByRoles(h.Roles)
	//		if statusIndex < 0 {
	//			errorMsg = append(errorMsg, fmt.Sprintf("infra status not fount in role tag: %v", h.Roles))
	//			continue
	//		}
	//		status := &hwProvider.Infra.Status.Hosts[statusIndex]
	//		err := hwProvider.ReconcileInstances(host, status)
	//		if err != nil {
	//			errorMsg = append(errorMsg, err.Error())
	//			status.Ready = false
	//		} else {
	//			status.Ready = true
	//		}
	//	}
	//	deleteData := current.Difference(spec)
	//	var instanceIDs []string
	//	finalStatus := hwProvider.Infra.Status.Hosts
	//	for _, roles := range deleteData.List() {
	//		statusIndex := hwProvider.Infra.Status.FindHostsByRolesString(roles)
	//		ids := hwProvider.Infra.Status.Hosts[statusIndex].IDs
	//		instanceIDs = append(instanceIDs, ids)
	//		finalStatus = append(finalStatus[:statusIndex], finalStatus[statusIndex+1:]...)
	//	}
	//	if len(instanceIDs) != 0 {
	//		ShouldBeDeleteInstancesIDs.SetValue(hwProvider.Infra.Status, strings.Join(instanceIDs, ","))
	//		hwProvider.DeleteResource(ShouldBeDeleteInstancesIDs, hwProvider.DeleteInstances)
	//		hwProvider.Infra.Status.Hosts = finalStatus
	//	}
	//
	//	if len(errorMsg) == 0 {
	//		return nil
	//	}
	//	return errors.New(strings.Join(errorMsg, " && "))
	//},
	GetZoneID: func(hwProvider *HwProvider) error {
		return hwProvider.ReconcileResource(ZoneID, hwProvider.GetAvailableZoneID)
	},
	//BindEIP: func(hwProvider *HwProvider) error {
	//	return hwProvider.ReconcileResource(EipID, hwProvider.BindEipForMaster0)
	//},
}

var DeleteFuncMap = map[ActionName]func(provider *HwProvider){
	//ReleaseEIP: func(hwProvider *HwProvider) {
	//	hwProvider.DeleteResource(EipID, hwProvider.ReleaseEipAddress)
	//},
	//ClearInstances: func(hwProvider *HwProvider) {
	//	var instanceIDs []string
	//	for _, h := range hwProvider.Infra.Status.Hosts {
	//		instances, err := hwProvider.GetInstancesInfo(h.ToHost(), JustGetInstanceInfo)
	//		if err != nil {
	//			logger.Error("get %s instanceInfo failed %v", strings.Join(h.Roles, ","), err)
	//		}
	//		for _, instance := range instances {
	//			instanceIDs = append(instanceIDs, instance.InstanceID)
	//		}
	//	}
	//
	//	if len(instanceIDs) != 0 {
	//		ShouldBeDeleteInstancesIDs.SetValue(hwProvider.Infra.Status, strings.Join(instanceIDs, ","))
	//	}
	//	hwProvider.DeleteResource(ShouldBeDeleteInstancesIDs, hwProvider.DeleteInstances)
	//},
	//DeleteVSwitch: func(hwProvider *HwProvider) {
	//	hwProvider.DeleteResource(VSwitchID, hwProvider.DeleteVSwitch)
	//},
	//DeleteSecurityGroup: func(hwProvider *HwProvider) {
	//	hwProvider.DeleteResource(SecurityGroupID, hwProvider.DeleteSecurityGroup)
	//},
	DeleteVPC: func(hwProvider *HwProvider) {
		hwProvider.DeleteResource(VpcID, hwProvider.DeleteVPC)
	},
}

func (a *HwProvider) basicAuth() basic.Credentials {
	//https://developer.huaweicloud.com/endpoint?ECS
	core.NewHcHttpClientBuilder()
	return basic.NewCredentialsBuilder().
		WithAk(a.Infra.Spec.Credential.AccessKey).
		WithSk(a.Infra.Spec.Credential.AccessSecret).
		WithProjectId(a.Infra.Spec.Credential.ProjectID).
		Build()
}

func (a *HwProvider) NewClient() (err error) {
	regionID := a.Infra.Spec.Metadata.RegionIDs[rand.Rand(len(a.Infra.Spec.Metadata.RegionIDs))]
	a.Infra.Status.Cluster.RegionID = regionID
	logger.Info("using regionID is %s", regionID)
	ecsEndpoint := fmt.Sprintf("https://ecs.%s.myhuaweicloud.com", regionID)
	vpcEndpoint := fmt.Sprintf("https://vpc.%s.myhuaweicloud.com", regionID)
	logger.Info("using ecs endpoint is %s", ecsEndpoint)
	logger.Info("using vpc endpoint is %s", vpcEndpoint)
	//var err error
	defer func() {
		if info := recover(); info != nil {
			err = fmt.Errorf("%v", info)
		}
	}()
	ecsClient := ecs.NewEcsClient(
		ecs.EcsClientBuilder().
			WithEndpoint(ecsEndpoint).
			WithCredential(a.basicAuth()).
			Build())
	vpcClient := vpc.NewVpcClient(
		vpc.VpcClientBuilder().
			WithEndpoint(vpcEndpoint).
			WithCredential(a.basicAuth()).
			Build())
	a.EcsClient = *ecsClient
	a.VpcClient = *vpcClient
	return
}

func (a *HwProvider) ClearCluster() {
	todolist := []ActionName{
		//ReleaseEIP,
		//ClearInstances,
		//DeleteVSwitch,
		//DeleteSecurityGroup,
		DeleteVPC,
	}
	for _, name := range todolist {
		DeleteFuncMap[name](a)
	}
}

func (a *HwProvider) Reconcile() error {
	if a.Infra.DeletionTimestamp != nil {
		logger.Info("deletionTimestamp not nil will clear infra")
		a.ClearCluster()
		return nil
	}
	todolist := []ActionName{
		GetZoneID,
		CreateVPC,
		//CreateVSwitch,
		//CreateSecurityGroup,
		//ReconcileInstance,
		//BindEIP,
	}

	for _, actionName := range todolist {
		err := RecocileFuncMap[actionName](a)
		if err != nil {
			logger.Warn("actionName: %s,err: %v ,skip it", actionName, err)
		}
	}

	return nil
}

func (a *HwProvider) Apply() error {
	return a.Reconcile()
}

func DefaultInfra(infra *v2.Infra) error {
	//if infra.Spec.InfraMetadata.IsSeize {
	//	infra.Status.InfraMetadata.SpotStrategy = "SpotAsPriceGo"
	//} else {
	//	infra.Status.InfraMetadata.SpotStrategy = "NoSpot"
	//}
	return nil
}

func DefaultValidate(infra *v2.Infra) field.ErrorList {
	allErrors := field.ErrorList{}
	//if provide == v1beta1.HuaweiProvider {
	//	if len(credential.ProjectID) == 0 {
	//		logger.Warn("in huawei cloud , you need fetch projectID in you iam, please visit https://support.huaweicloud.com/apm_faq/apm_03_0001.html")
	//		allErrors = append(allErrors, field.Invalid(fldPath.Key("projectID"), credential.ProjectID,
	//			"projectID not empty"))
	//	}
	//}
	return allErrors
}
