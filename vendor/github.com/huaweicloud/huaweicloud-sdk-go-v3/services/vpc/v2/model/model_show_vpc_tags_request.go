package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type ShowVpcTagsRequest struct {
	// 功能说明：虚拟私有云唯一标识 取值范围：合法UUID 约束：ID对应的VPC必须存在

	VpcId string `json:"vpc_id"`
}

func (o ShowVpcTagsRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ShowVpcTagsRequest struct{}"
	}

	return strings.Join([]string{"ShowVpcTagsRequest", string(data)}, " ")
}
