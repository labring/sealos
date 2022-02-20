package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

// Request Object
type ListVpcRoutesRequest struct {
	// 每页返回的个数

	Limit *int32 `json:"limit,omitempty"`
	// 分页查询起始的资源ID，为空时查询第一页

	Marker *string `json:"marker,omitempty"`
	// 按照routes_id过滤查询

	Id *string `json:"id,omitempty"`
	// 功能说明：按照路由类型过滤查询  取值范围：peering

	Type *ListVpcRoutesRequestType `json:"type,omitempty"`
	// 按照vpc_id过滤查询

	VpcId *string `json:"vpc_id,omitempty"`
	// 按照路由目的地址CIDR过滤查询

	Destination *string `json:"destination,omitempty"`
	// 按照项目ID过滤查询

	TenantId *string `json:"tenant_id,omitempty"`
}

func (o ListVpcRoutesRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ListVpcRoutesRequest struct{}"
	}

	return strings.Join([]string{"ListVpcRoutesRequest", string(data)}, " ")
}

type ListVpcRoutesRequestType struct {
	value string
}

type ListVpcRoutesRequestTypeEnum struct {
	PEERING ListVpcRoutesRequestType
}

func GetListVpcRoutesRequestTypeEnum() ListVpcRoutesRequestTypeEnum {
	return ListVpcRoutesRequestTypeEnum{
		PEERING: ListVpcRoutesRequestType{
			value: "peering",
		},
	}
}

func (c ListVpcRoutesRequestType) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *ListVpcRoutesRequestType) UnmarshalJSON(b []byte) error {
	myConverter := converter.StringConverterFactory("string")
	if myConverter != nil {
		val, err := myConverter.CovertStringToInterface(strings.Trim(string(b[:]), "\""))
		if err == nil {
			c.value = val.(string)
			return nil
		}
		return err
	} else {
		return errors.New("convert enum data to string error")
	}
}
