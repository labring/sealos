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

	"github.com/labring/sealos/pkg/types/v1beta1"
)

const (
	Scheme              = "https"
	Product             = "product"
	Role                = "role"
	Arch                = "arch"
	AliDomain           = "sealos.io/"
	TryTimes            = 10
	TrySleepTime        = time.Second
	JustGetInstanceInfo = 0
)

var categories = []string{"cloud", "cloud_efficiency", "cloud_ssd", "cloud_essd"}

const AliyunProvider v1beta1.Provider = "AliyunProvider"

type ResourceName string

const (
	EipID                      ResourceName = AliDomain + "EipID"
	VpcID                      ResourceName = AliDomain + "VpcID"
	VSwitchID                  ResourceName = AliDomain + "VSwitchID"
	SecurityGroupID            ResourceName = AliDomain + "SecurityGroupID"
	ZoneID                     ResourceName = AliDomain + "ZoneID"
	ShouldBeDeleteInstancesIDs ResourceName = "ShouldBeDeleteInstancesIDs"
)

func (r ResourceName) ClusterValue(infra v1beta1.InfraSpec) string {
	return infra.Metadata.Annotations[string(r)]
}

func (r ResourceName) ClusterSetValue(infra v1beta1.InfraSpec, val string) {
	infra.Metadata.Annotations[string(r)] = val
}

func (r ResourceName) Value(status v1beta1.InfraStatus) string {
	return status.Cluster.Annotations[string(r)]
}

func (r ResourceName) SetValue(status v1beta1.InfraStatus, val string) {
	status.Cluster.Annotations[string(r)] = val
}

type ImageArch string

func ConvertImageArch(arch v1beta1.Arch) ImageArch {
	switch arch {
	case v1beta1.ARM64:
		return "arm64"
	case v1beta1.AMD64:
		return "x86_64"
	}
	return ""
}
