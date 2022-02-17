package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type DeleteVpcTagRequest struct {
	// 功能说明：虚拟私有云唯一标识 取值范围：合法UUID 约束：ID对应的VPC必须存在

	VpcId string `json:"vpc_id"`
	// 功能说明：标签键

	Key string `json:"key"`
}

func (o DeleteVpcTagRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "DeleteVpcTagRequest struct{}"
	}

	return strings.Join([]string{"DeleteVpcTagRequest", string(data)}, " ")
}
