package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type AllowedAddressPair struct {
	// 功能说明：IP地址 取值范围：可以是IP地址或CIDR 约束：不支持0.0.0.0/0如果allowed_address_pairs配置地址池较大的CIDR（掩码小于24位），建议为该port配置一个单独的安全组。 如果填写allowed_address_pairs参数，则ip_address是必选参数。

	IpAddress string `json:"ip_address"`
	// mac地址

	MacAddress *string `json:"mac_address,omitempty"`
}

func (o AllowedAddressPair) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "AllowedAddressPair struct{}"
	}

	return strings.Join([]string{"AllowedAddressPair", string(data)}, " ")
}
