// Copyright © 2023 sealos.
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

import "github.com/aliyun/alibaba-cloud-sdk-go/sdk/requests"

const (
	ECSInstanceStatusNameRunning   = "Running"
	ECSInstanceStatusNamePending   = "Pending"
	ECSInstanceStatusNameStarting  = "Starting"
	ECSInstanceStatusNameStopping  = "Stopping"
	ECSInstanceStatusNameStopped   = "Stopped"
	defaultRootVolumeType          = "cloud_essd"
	defaultRootVolumeSize          = 40
	defaultAvailabilityZone        = "cn-hangzhou-i"
	defaultInternetMaxBandwidthOut = requests.Integer("10")
	defaultInstanceChargeType      = "PostPaid"
	defaultVpcCidrBlock            = "172.16.0.0/12"
	defaultVSwitchCidrBlock        = "172.16.0.0/16"
	systemDiskType                 = "system"
	defaultIPProtocol              = "tcp"
	defaultPortRange               = "1/65535"
	defaultSourceCidrIP            = "0.0.0.0/0"
	resourceTypeInstance           = "instance"
)
