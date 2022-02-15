package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// This is a auto create Body Object
type AttachServerVolumeRequestBody struct {
	VolumeAttachment *AttachServerVolumeOption `json:"volumeAttachment"`
}

func (o AttachServerVolumeRequestBody) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "AttachServerVolumeRequestBody struct{}"
	}

	return strings.Join([]string{"AttachServerVolumeRequestBody", string(data)}, " ")
}
