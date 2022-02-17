package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// 云服务器可挂载网卡和卷数。
type ServerAttachableQuantity struct {
	// 可挂载scsi卷数。

	FreeScsi int32 `json:"free_scsi"`
	// 可挂载vbd卷数。

	FreeBlk int32 `json:"free_blk"`
	// 可挂载卷数。

	FreeDisk int32 `json:"free_disk"`
	// 可挂载网卡数。

	FreeNic int32 `json:"free_nic"`
}

func (o ServerAttachableQuantity) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ServerAttachableQuantity struct{}"
	}

	return strings.Join([]string{"ServerAttachableQuantity", string(data)}, " ")
}
