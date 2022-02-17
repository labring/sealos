package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type DeleteVpcResponse struct {
	HttpStatusCode int `json:"-"`
}

func (o DeleteVpcResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "DeleteVpcResponse struct{}"
	}

	return strings.Join([]string{"DeleteVpcResponse", string(data)}, " ")
}
