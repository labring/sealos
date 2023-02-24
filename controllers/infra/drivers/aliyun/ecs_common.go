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
	defaultSecurityGroupID         = "sg-bp17m0pc0xpv67hie96f"
	defaultVSwitchID               = "vsw-bp1vninehmbpi43k5jls2"
	defaultAvailabilityZone        = "cn-hangzhou-i"
	defaultInternetMaxBandwidthOut = requests.Integer("10")
	defaultInstanceChargeType      = "PostPaid"
)
