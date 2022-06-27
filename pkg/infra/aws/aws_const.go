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

package aws_provider

import (
	"math/rand"
	"time"

	"github.com/labring/sealos/pkg/types/v1beta1"
)

const (
	Scheme              = "https"
	Product             = "product"
	Role                = "role"
	Arch                = "arch"
	AwsDomain           = "sealos.io/"
	TryTimes            = 10
	TrySleepTime        = time.Second
	JustGetInstanceInfo = 0
	DefaultRegion       = ""
	RegionEnv           = "AWS_DEFAULT_REGION"
)

// Define all OS and corresponding AMI name formats
var osDescs = map[string]map[string]string{
	"Amazon Linux": {
		"ebs":            "amzn-ami-hvm-????.??.?.????????.?-*-gp2",
		"instance-store": "amzn-ami-hvm-????.??.?.????????.?-*-s3",
	},
	"Amazon Linux 2": {
		"ebs": "amzn2-ami-hvm-2.?.????????.?-*-gp2",
	},
	"Red Hat": {
		"ebs": "RHEL-?.?.?_HVM-????????-*-?-Hourly2-GP2",
	},
	"SUSE Linux": {
		"ebs": "suse-sles-??-sp?-v????????-hvm-ssd-*",
	},
	// Ubuntu 18.04 LTS
	"Ubuntu": {
		"ebs":            "ubuntu/images/hvm-ssd/ubuntu-bionic-18.04-*-server-????????",
		"instance-store": "ubuntu/images/hvm-instance/ubuntu-bionic-18.04-*-server-????????",
	},
	// 64 bit Microsoft Windows Server with Desktop Experience Locale English AMI
	"Windows": {
		"ebs": "Windows_Server-????-English-Full-Base-????.??.??",
	},
}

func GetImagePriority() []string {
	return []string{"Amazon Linux 2", "Ubuntu", "Amazon Linux", "Red Hat", "SUSE Linux", "Windows"}
}

var categories = []string{"cloud", "cloud_efficiency", "cloud_ssd", "cloud_essd"}

// Use instance-store if supported
var rootDeviceType = "ebs"

const AwsCloudProvider v1beta1.Provider = "AwsProvider"

type ResourceName string

const (
	EipID                      ResourceName = AwsDomain + "EipID"
	VpcID                      ResourceName = AwsDomain + "VpcID"
	VSwitchID                  ResourceName = AwsDomain + "VSwitchID"
	SecurityGroupID            ResourceName = AwsDomain + "SecurityGroupID"
	ZoneID                     ResourceName = AwsDomain + "ZoneID"
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

const letterBytes = "abcdefghijklmnopqrstuvwxyz0123456789"
const (
	letterIdxBits = 6                    // 6 bits to represent a letter index
	letterIdxMask = 1<<letterIdxBits - 1 // All 1-bits, as many as letterIdxBits
)

func RandStringBytesMask(n int) string {
	b := make([]byte, n)
	for i := 0; i < n; {
		if idx := int(rand.Int63() & letterIdxMask); idx < len(letterBytes) {
			b[i] = letterBytes[idx]
			i++
		}
	}
	return string(b)
}

func RandSecurityGroup() *string {
	s := RandStringBytesMask(5)
	return &s
}
