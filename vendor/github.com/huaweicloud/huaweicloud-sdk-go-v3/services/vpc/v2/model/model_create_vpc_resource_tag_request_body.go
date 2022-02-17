package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// This is a auto create Body Object
type CreateVpcResourceTagRequestBody struct {
	Tag *ResourceTag `json:"tag"`
}

func (o CreateVpcResourceTagRequestBody) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "CreateVpcResourceTagRequestBody struct{}"
	}

	return strings.Join([]string{"CreateVpcResourceTagRequestBody", string(data)}, " ")
}
