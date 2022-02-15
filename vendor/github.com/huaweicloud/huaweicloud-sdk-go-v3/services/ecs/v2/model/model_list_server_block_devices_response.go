package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type ListServerBlockDevicesResponse struct {
	AttachableQuantity *BlockDeviceAttachableQuantity `json:"attachableQuantity,omitempty"`
	// 云服务器挂载信息列表。

	VolumeAttachments *[]ServerBlockDevice `json:"volumeAttachments,omitempty"`
	HttpStatusCode    int                  `json:"-"`
}

func (o ListServerBlockDevicesResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ListServerBlockDevicesResponse struct{}"
	}

	return strings.Join([]string{"ListServerBlockDevicesResponse", string(data)}, " ")
}
