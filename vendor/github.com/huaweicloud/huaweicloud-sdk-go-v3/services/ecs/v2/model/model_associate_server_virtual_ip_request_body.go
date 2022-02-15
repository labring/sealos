package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// This is a auto create Body Object
type AssociateServerVirtualIpRequestBody struct {
	Nic *AssociateServerVirtualIpOption `json:"nic"`
}

func (o AssociateServerVirtualIpRequestBody) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "AssociateServerVirtualIpRequestBody struct{}"
	}

	return strings.Join([]string{"AssociateServerVirtualIpRequestBody", string(data)}, " ")
}
