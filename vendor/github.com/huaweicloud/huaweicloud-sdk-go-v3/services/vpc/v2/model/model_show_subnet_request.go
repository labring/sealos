package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type ShowSubnetRequest struct {
	// 子网ID

	SubnetId string `json:"subnet_id"`
}

func (o ShowSubnetRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ShowSubnetRequest struct{}"
	}

	return strings.Join([]string{"ShowSubnetRequest", string(data)}, " ")
}
