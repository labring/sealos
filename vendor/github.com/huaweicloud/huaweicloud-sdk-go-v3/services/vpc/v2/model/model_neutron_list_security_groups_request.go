package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type NeutronListSecurityGroupsRequest struct {
	// 每页返回的个数

	Limit *int32 `json:"limit,omitempty"`
	// 分页查询起始的资源ID，为空时查询第一页

	Marker *string `json:"marker,omitempty"`
	// 按照安全组对应的ID过滤查询

	Id *string `json:"id,omitempty"`
	// 按照安全组的名称过滤查询

	Name *string `json:"name,omitempty"`
	// 按照安全组的描述过滤查询

	Description *string `json:"description,omitempty"`
	// 按照安全组所属的项目ID过滤查询

	TenantId *string `json:"tenant_id,omitempty"`
}

func (o NeutronListSecurityGroupsRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronListSecurityGroupsRequest struct{}"
	}

	return strings.Join([]string{"NeutronListSecurityGroupsRequest", string(data)}, " ")
}
