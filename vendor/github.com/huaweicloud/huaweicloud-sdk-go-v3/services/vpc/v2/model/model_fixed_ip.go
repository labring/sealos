package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type FixedIp struct {
	// 功能说明：端口IP地址,如果同时指定子网ID和IP地址，会尝试将该子网上的IP地址分配给该端口。 如果仅指定子网ID，会将该子网中的可用IP分配给该端口。 如果仅指定IP地址，会尝试分配IP地址（如果该地址是指定网络上任何子网的有效IP）

	IpAddress *string `json:"ip_address,omitempty"`
	// 功能说明：端口所属子网ID,如果同时指定子网ID和IP地址，会尝试将该子网上的IP地址分配给该端口。 如果仅指定子网ID，会将该子网中的可用IP分配给该端口。 如果仅指定IP地址，会尝试分配IP地址（如果该地址是指定网络上任何子网的有效IP）

	SubnetId *string `json:"subnet_id,omitempty"`
}

func (o FixedIp) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "FixedIp struct{}"
	}

	return strings.Join([]string{"FixedIp", string(data)}, " ")
}
