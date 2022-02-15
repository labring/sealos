package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type NetworkIpAvailability struct {
	// 网络ID

	NetworkId string `json:"network_id"`
	// 网络名称

	NetworkName string `json:"network_name"`
	// 项目ID

	TenantId string `json:"tenant_id"`
	// 网络中IP总数（不包含系统预留地址）

	TotalIps int32 `json:"total_ips"`
	// 网络中已经使用的IP数目（不包含系统预留地址）

	UsedIps int32 `json:"used_ips"`
	// 子网IP使用情况的对象

	SubnetIpAvailability []SubnetIpAvailability `json:"subnet_ip_availability"`
}

func (o NetworkIpAvailability) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NetworkIpAvailability struct{}"
	}

	return strings.Join([]string{"NetworkIpAvailability", string(data)}, " ")
}
