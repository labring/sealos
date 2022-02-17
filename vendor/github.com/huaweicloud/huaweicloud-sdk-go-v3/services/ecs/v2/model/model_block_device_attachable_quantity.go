package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// 云服务器可挂载磁盘数量。
type BlockDeviceAttachableQuantity struct {
	// 云服务器可挂载scsi类型磁盘数量。

	FreeScsi *int32 `json:"free_scsi,omitempty"`
	// 云服务器可挂载virtio_blk类型磁盘数量。

	FreeBlk *int32 `json:"free_blk,omitempty"`
	// 云服务器可挂载磁盘总数。

	FreeDisk *int32 `json:"free_disk,omitempty"`
}

func (o BlockDeviceAttachableQuantity) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "BlockDeviceAttachableQuantity struct{}"
	}

	return strings.Join([]string{"BlockDeviceAttachableQuantity", string(data)}, " ")
}
