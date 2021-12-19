// Copyright © 2021 Alibaba Group Holding Ltd.
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

package aliyun

import (
	"errors"
	"strings"

	"github.com/fanux/sealos/pkg/types/validation"

	v2 "github.com/fanux/sealos/pkg/types/v1beta1"
	"github.com/fanux/sealos/pkg/utils/logger"

	"github.com/aliyun/alibaba-cloud-sdk-go/services/ecs"
	"github.com/aliyun/alibaba-cloud-sdk-go/services/vpc"
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
	GetSystemInfo       ActionName = "GetSystemInfo"
)

type AliProvider struct {
	Config    Config
	EcsClient ecs.Client
	VpcClient vpc.Client
	Infra     *v2.Infra
}

type Config struct {
	AccessKey    string
	AccessSecret string
	regionID     string
}

type Alifunc func() error

func (a *AliProvider) ReconcileResource(resourceKey ResourceName, action Alifunc) error {
	if resourceKey.Value(a.Infra.Status) != "" {
		logger.Warn("create resource exists %s: %s", resourceKey, resourceKey.Value(a.Infra.Status))
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

func (a *AliProvider) DeleteResource(resourceKey ResourceName, action Alifunc) {
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

var RecocileFuncMap = map[ActionName]func(provider *AliProvider) error{
	CreateVPC: func(aliProvider *AliProvider) error {
		return aliProvider.ReconcileResource(VpcID, aliProvider.CreateVPC)
	},

	CreateVSwitch: func(aliProvider *AliProvider) error {
		return aliProvider.ReconcileResource(VSwitchID, aliProvider.CreateVSwitch)
	},
	CreateSecurityGroup: func(aliProvider *AliProvider) error {
		return aliProvider.ReconcileResource(SecurityGroupID, aliProvider.CreateSecurityGroup)
	},
	ReconcileInstance: func(aliProvider *AliProvider) error {
		err := aliProvider.ReconcileInstances(Master)
		if err != nil {
			return err
		}

		err = aliProvider.ReconcileInstances(Node)
		if err != nil {
			return err
		}
		return nil
	},
	GetSystemInfo: func(aliProvider *AliProvider) error {
		return aliProvider.ReconcileResource(SystemInfo, aliProvider.SystemInfo)
	},
	BindEIP: func(aliProvider *AliProvider) error {
		return aliProvider.ReconcileResource(EipID, aliProvider.BindEipForMaster0)
	},
}

var DeleteFuncMap = map[ActionName]func(provider *AliProvider){
	ReleaseEIP: func(aliProvider *AliProvider) {
		aliProvider.DeleteResource(EipID, aliProvider.ReleaseEipAddress)
	},
	ClearInstances: func(aliProvider *AliProvider) {
		var instanceIDs []string
		roles := []string{Master, Node}
		for _, role := range roles {
			instances, err := aliProvider.GetInstancesInfo(role, JustGetInstanceInfo)
			if err != nil {
				logger.Error("get %s instanceinfo failed %v", role, err)
			}
			for _, instance := range instances {
				instanceIDs = append(instanceIDs, instance.InstanceID)
			}
		}
		if len(instanceIDs) != 0 {
			aliProvider.Infra.Status.ShouldBeDeleteInstancesIDs = strings.Join(instanceIDs, ",")
		}
		aliProvider.DeleteResource(ShouldBeDeleteInstancesIDs, aliProvider.DeleteInstances)
	},
	DeleteVSwitch: func(aliProvider *AliProvider) {
		aliProvider.DeleteResource(VSwitchID, aliProvider.DeleteVSwitch)
	},
	DeleteSecurityGroup: func(aliProvider *AliProvider) {
		aliProvider.DeleteResource(SecurityGroupID, aliProvider.DeleteSecurityGroup)
	},
	DeleteVPC: func(aliProvider *AliProvider) {
		aliProvider.DeleteResource(VpcID, aliProvider.DeleteVPC)
	},
}

func (a *AliProvider) NewClient() error {
	ecsClient, err := ecs.NewClientWithAccessKey(a.Config.regionID, a.Config.AccessKey, a.Config.AccessSecret)
	if err != nil {
		return err
	}
	vpcClient, err := vpc.NewClientWithAccessKey(a.Config.regionID, a.Config.AccessKey, a.Config.AccessSecret)
	if err != nil {
		return err
	}
	a.EcsClient = *ecsClient
	a.VpcClient = *vpcClient
	a.Infra.Status.RegionID = a.Config.regionID
	return nil
}

func (a *AliProvider) ClearCluster() {
	todolist := []ActionName{
		ReleaseEIP,
		ClearInstances,
		DeleteVSwitch,
		DeleteSecurityGroup,
		DeleteVPC,
	}
	for _, name := range todolist {
		DeleteFuncMap[name](a)
	}
}

func (a *AliProvider) Reconcile() error {
	if a.Infra.Annotations == nil {
		a.Infra.Annotations = make(map[string]string)
	}
	if a.Infra.DeletionTimestamp != nil {
		logger.Info("DeletionTimestamp not nil Clear Infra")
		a.ClearCluster()
		return nil
	}
	todolist := []ActionName{
		CreateVPC,
		GetSystemInfo,
		CreateVSwitch,
		CreateSecurityGroup,
		ReconcileInstance,
		BindEIP,
	}

	for _, actionname := range todolist {
		err := RecocileFuncMap[actionname](a)
		if err != nil {
			return err
		}
	}

	return nil
}

func (a *AliProvider) Apply() error {
	if err := v2.Default(a.Infra, defaultInfra); err != nil {
		return err
	}
	if err := validation.ValidateInfra(a.Infra); len(err) != 0 {
		return err.ToAggregate()
	}
	return a.Reconcile()
}

func defaultInfra(infra *v2.Infra) error {
	//https://help.aliyun.com/document_detail/63440.htm?spm=a2c4g.11186623.0.0.f5952752gkxpB7#t9856.html
	if infra.Spec.Instance.IsSeize {
		infra.Status.SpotStrategy = "SpotAsPriceGo"
	} else {
		infra.Status.SpotStrategy = "NoSpot"
	}
	if infra.Spec.Platform == v2.ARM64 {
		switch infra.Status.RegionID {
		case "cn-shanghai":
			infra.Status.ZoneID = "cn-shanghai-l"
		case "cn-beijing":
			infra.Status.ZoneID = "cn-beijing-k"
		case "cn-hangzhou":
			infra.Status.ZoneID = "cn-hangzhou-i"
		default:
			return errors.New("not available ZoneID for arm, support RegionID[cn-shanghai,cn-beijing,cn-hangzhou]")
		}
		infra.Spec.Instance.ImageID = defaultImageArmID
	} else {
		infra.Spec.Instance.ImageID = defaultImageAmdID
	}
	//"cloud_efficiency", "cloud_essd", "cloud_ssd"
	if infra.Spec.Instance.SystemCategory == "" {
		infra.Spec.Instance.SystemCategory = "cloud_efficiency"
	}
	if infra.Spec.Instance.DataCategory == "" {
		infra.Spec.Instance.DataCategory = "cloud_efficiency"
	}
	return nil
}
