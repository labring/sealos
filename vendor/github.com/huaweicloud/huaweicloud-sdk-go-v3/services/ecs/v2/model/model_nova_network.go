package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type NovaNetwork struct {
	// IP地址。

	Addr string `json:"addr"`
	// IP地址类型，值为4或6。  4：IP地址类型是IPv4 6：IP地址类型是IPv6

	Version int32 `json:"version"`
	// 扩展属性，MAC地址。

	OSEXTIPSMACmacAddr string `json:"OS-EXT-IPS-MAC:mac_addr"`
	// 扩展属性，分配IP地址方式。

	OSEXTIPStype string `json:"OS-EXT-IPS:type"`
}

func (o NovaNetwork) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NovaNetwork struct{}"
	}

	return strings.Join([]string{"NovaNetwork", string(data)}, " ")
}
