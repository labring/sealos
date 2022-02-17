package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type BatchDeleteVpcTagsRequest struct {
	// 功能说明：虚拟私有云唯一标识 取值范围：合法UUID 约束：ID对应的VPC必须存在

	VpcId string `json:"vpc_id"`

	Body *BatchDeleteVpcTagsRequestBody `json:"body,omitempty"`
}

func (o BatchDeleteVpcTagsRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "BatchDeleteVpcTagsRequest struct{}"
	}

	return strings.Join([]string{"BatchDeleteVpcTagsRequest", string(data)}, " ")
}
