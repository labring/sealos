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
	"time"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
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
	Product             = "product"
	Role                = "role"
	Arch                = "arch"
	Stopped             = "Stopped"
	AvailableTypeStatus = "WithStock"
	Bandwidth           = "100"
	HwDomain            = "sealos.io/"
	TryTimes            = 10
	TrySleepTime        = time.Second
	JustGetInstanceInfo = 0
)

const HuaweiProvider v2.Provider = "HuaweiProvider"

type ResourceName string

const (
	EipID                      ResourceName = HwDomain + "EipID"
	VpcID                      ResourceName = HwDomain + "VpcID"
	VSwitchID                  ResourceName = HwDomain + "VSwitchID"
	SecurityGroupID            ResourceName = HwDomain + "SecurityGroupID"
	ZoneID                     ResourceName = HwDomain + "ZoneID"
	ShouldBeDeleteInstancesIDs ResourceName = "ShouldBeDeleteInstancesIDs"
)

func (r ResourceName) ClusterValue(infra v2.InfraSpec) string {
	return infra.Metadata.Annotations[string(r)]
}

func (r ResourceName) ClusterSetValue(infra v2.InfraSpec, val string) {
	infra.Metadata.Annotations[string(r)] = val
}

func (r ResourceName) Value(status v2.InfraStatus) string {
	return status.Cluster.Annotations[string(r)]
}

func (r ResourceName) SetValue(status v2.InfraStatus, val string) {
	status.Cluster.Annotations[string(r)] = val
}

type ImageArch string

func ConvertImageArch(arch v2.Arch) ImageArch {
	switch arch {
	case v2.ARM64:
		return "arm64"
	case v2.AMD64:
		return "x86_64"
	}
	return ""
}
