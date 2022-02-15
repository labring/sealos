package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

type InterfaceAttachment struct {
	// 网卡私网IP信息列表。

	FixedIps *[]ServerInterfaceFixedIp `json:"fixed_ips,omitempty"`
	// 网卡Mac地址信息。

	MacAddr *string `json:"mac_addr,omitempty"`
	// 网卡端口所属网络ID。

	NetId *string `json:"net_id,omitempty"`
	// 网卡端口ID。

	PortId *string `json:"port_id,omitempty"`
	// 网卡端口状态。

	PortState *string `json:"port_state,omitempty"`
	// 卸载网卡时，是否删除网卡。

	DeleteOnTermination *bool `json:"delete_on_termination,omitempty"`
	// 从guest os中，网卡的驱动类型。可选值为virtio和hinic，默认为virtio

	DriverMode *string `json:"driver_mode,omitempty"`
	// 网卡带宽下限。

	MinRate *int32 `json:"min_rate,omitempty"`
	// 网卡多队列个数。

	MultiqueueNum *int32 `json:"multiqueue_num,omitempty"`
	// 弹性网卡在Linux GuestOS里的BDF号

	PciAddress *string `json:"pci_address,omitempty"`
}

func (o InterfaceAttachment) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "InterfaceAttachment struct{}"
	}

	return strings.Join([]string{"InterfaceAttachment", string(data)}, " ")
}
