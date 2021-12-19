/*
Copyright 2021 cuisongliu@qq.com.

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

package aliyun

import (
	"time"

	v2 "github.com/fanux/sealos/pkg/types/v1beta1"
)

const (
	EnvAccessKey    = "ECS_AKID"
	EnvAccessSecret = "ECS_AKSK"
	EnvRegion       = "ECS_REGION"
)

const (
	Scheme              = "https"
	IPProtocol          = "tcp"
	APIServerPortRange  = "6443/6443"
	SSHPortRange        = "22/22"
	SourceCidrIP        = "0.0.0.0/0"
	CidrBlock           = "172.16.0.0/24"
	Policy              = "accept"
	DestinationResource = "InstanceType"
	InstanceChargeType  = "PostPaid"
	InternetChargeType  = "PayByTraffic"
	defaultImageAmdID   = "centos_7_9_x64_20G_alibase_20210927.vhd"
	defaultImageArmID   = "anolisos_7_7_arm64_20G_anck_alibase_20211118.vhd"
	Product             = "product"
	Role                = "role"
	Master              = "master"
	Node                = "node"
	Stopped             = "Stopped"
	AvailableTypeStatus = "WithStock"
	Bandwidth           = "100"
	AliDomain           = "www.sealyun.com/"
	DefaultRegionID     = "cn-shanghai"
	TryTimes            = 10
	TrySleepTime        = time.Second
	JustGetInstanceInfo = 0
)

type ResourceName string

const (
	EipID                      ResourceName = AliDomain + "EipID"
	VpcID                      ResourceName = AliDomain + "VpcID"
	VSwitchID                  ResourceName = AliDomain + "VSwitchID"
	SecurityGroupID            ResourceName = AliDomain + "SecurityGroupID"
	SystemInfo                 ResourceName = AliDomain + "SystemInfo"
	ShouldBeDeleteInstancesIDs ResourceName = "ShouldBeDeleteInstancesIDs"
)

func (r ResourceName) Value(status v2.InfraStatus) string {
	var value string
	switch r {
	case EipID:
		value = status.EIPID
	case VpcID:
		value = status.VpcID
	case VSwitchID:
		value = status.VSwitchID
	case SecurityGroupID:
		value = status.SecurityGroupID
	case ShouldBeDeleteInstancesIDs:
		value = status.ShouldBeDeleteInstancesIDs
	default:
	}
	return value
}
