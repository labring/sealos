package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type UpdateSubnetRequestBody struct {
	Subnet *UpdateSubnetOption `json:"subnet"`
}

func (o UpdateSubnetRequestBody) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "UpdateSubnetRequestBody struct{}"
	}

	return strings.Join([]string{"UpdateSubnetRequestBody", string(data)}, " ")
}
