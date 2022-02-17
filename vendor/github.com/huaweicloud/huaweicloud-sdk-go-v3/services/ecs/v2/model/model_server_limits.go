package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type ServerLimits struct {
	// 镜像元数据最大的长度。

	MaxImageMeta int32 `json:"maxImageMeta"`
	// 可注入文件的最大个数。

	MaxPersonality int32 `json:"maxPersonality"`
	// 注入文件内容的最大长度（单位：Byte）。

	MaxPersonalitySize int32 `json:"maxPersonalitySize"`
	// 安全组中安全组规则最大的配置个数。   > 说明：  - 具体配额限制请以VPC配额限制为准。

	MaxSecurityGroupRules int32 `json:"maxSecurityGroupRules"`
	// 安全组最大使用个数。  > 说明：  - 具体配额限制请以VPC配额限制为准。

	MaxSecurityGroups int32 `json:"maxSecurityGroups"`
	// 服务器组中的最大虚拟机数。

	MaxServerGroupMembers int32 `json:"maxServerGroupMembers"`
	// 服务器组的最大个数。

	MaxServerGroups int32 `json:"maxServerGroups"`
	// 可输入元数据的最大长度。

	MaxServerMeta int32 `json:"maxServerMeta"`
	// CPU核数最大申请数量。

	MaxTotalCores int32 `json:"maxTotalCores"`
	// 最大的浮动IP使用个数。

	MaxTotalFloatingIps int32 `json:"maxTotalFloatingIps"`
	// 云服务器最大申请数量。

	MaxTotalInstances int32 `json:"maxTotalInstances"`
	// 可以申请的SSH密钥对最大数量。

	MaxTotalKeypairs int32 `json:"maxTotalKeypairs"`
	// 内存最大申请容量（单位：MB）。

	MaxTotalRAMSize int32 `json:"maxTotalRAMSize"`
	// 当前已使用CPU核数。

	TotalCoresUsed int32 `json:"totalCoresUsed"`
	// 当前浮动IP使用个数。

	TotalFloatingIpsUsed int32 `json:"totalFloatingIpsUsed"`
	// 当前云服务器使用个数。

	TotalInstancesUsed int32 `json:"totalInstancesUsed"`
	// 当前内存使用容量（单位：MB）。

	TotalRAMUsed int32 `json:"totalRAMUsed"`
	// 当前安全组使用个数。

	TotalSecurityGroupsUsed int32 `json:"totalSecurityGroupsUsed"`
	// 已使用的服务器组个数。

	TotalServerGroupsUsed int32 `json:"totalServerGroupsUsed"`
	// 竞价实例的最大申请数量。

	MaxTotalSpotInstances *int32 `json:"maxTotalSpotInstances,omitempty"`
	// 竞价实例的CPU核数最大申请数量。

	MaxTotalSpotCores *int32 `json:"maxTotalSpotCores,omitempty"`
	// 竞价实例的内存最大申请容量（单位：MB）。

	MaxTotalSpotRAMSize *int32 `json:"maxTotalSpotRAMSize,omitempty"`
	// 当前竞价实例的使用个数。

	TotalSpotInstancesUsed *int32 `json:"totalSpotInstancesUsed,omitempty"`
	// 当前竞价实例已使用的CPU核数。

	TotalSpotCoresUsed *int32 `json:"totalSpotCoresUsed,omitempty"`
	// 当前竞价实例的内存使用容量（单位：MB）。

	TotalSpotRAMUsed *int32 `json:"totalSpotRAMUsed,omitempty"`
	// 使用该flavor可以申请的弹性云服务器数量。  值为“-1”时，表示无数量限制。

	LimitByFlavor *[]ProjectFlavorLimit `json:"limit_by_flavor,omitempty"`
}

func (o ServerLimits) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ServerLimits struct{}"
	}

	return strings.Join([]string{"ServerLimits", string(data)}, " ")
}
