package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// This is a auto create Body Object
type DisassociateServerVirtualIpRequestBody struct {
	Nic *DisassociateServerVirtualIpOption `json:"nic"`
}

func (o DisassociateServerVirtualIpRequestBody) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "DisassociateServerVirtualIpRequestBody struct{}"
	}

	return strings.Join([]string{"DisassociateServerVirtualIpRequestBody", string(data)}, " ")
}
