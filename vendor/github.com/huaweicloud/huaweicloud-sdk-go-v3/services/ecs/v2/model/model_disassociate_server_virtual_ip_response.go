package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type DisassociateServerVirtualIpResponse struct {
	// 云服务器网卡ID

	PortId         *string `json:"port_id,omitempty"`
	HttpStatusCode int     `json:"-"`
}

func (o DisassociateServerVirtualIpResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "DisassociateServerVirtualIpResponse struct{}"
	}

	return strings.Join([]string{"DisassociateServerVirtualIpResponse", string(data)}, " ")
}
