package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// 查询云服务器指定磁盘挂载信息响应信息
type ServerBlockDevice struct {
	// 云硬盘启动顺序。  - 0为系统盘。  - 非0为数据盘

	BootIndex *int32 `json:"bootIndex,omitempty"`
	// pci地址。

	PciAddress *string `json:"pciAddress,omitempty"`
	// 云硬盘ID，UUID格式。

	VolumeId *string `json:"volumeId,omitempty"`
	// 云硬盘挂载盘符，即磁盘挂载点。

	Device *string `json:"device,omitempty"`
	// 弹性云服务器ID，UUID格式。

	ServerId *string `json:"serverId,omitempty"`
	// 挂载ID，与云硬盘ID相同。UUID格式。

	Id *string `json:"id,omitempty"`
	// 云硬盘大小，单位GB。

	Size *int32 `json:"size,omitempty"`
	// 磁盘总线类型 。  取值范围：virtio、scsi

	Bus *string `json:"bus,omitempty"`
}

func (o ServerBlockDevice) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ServerBlockDevice struct{}"
	}

	return strings.Join([]string{"ServerBlockDevice", string(data)}, " ")
}
