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
	Scheme              = "https"
	Product             = "product"
	Role                = "role"
	Arch                = "arch"
	AliDomain           = "www.sealyun.com/"
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
	ZoneID                     ResourceName = AliDomain + "ZoneID"
	ShouldBeDeleteInstancesIDs ResourceName = "ShouldBeDeleteInstancesIDs"
)

func (r ResourceName) ClusterValue(infra v2.InfraSpec) string {
	return infra.Cluster.Annotations[string(r)]
}

func (r ResourceName) ClusterSetValue(infra v2.InfraSpec, val string) {
	infra.Cluster.Annotations[string(r)] = val
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
