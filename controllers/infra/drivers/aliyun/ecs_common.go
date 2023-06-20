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
