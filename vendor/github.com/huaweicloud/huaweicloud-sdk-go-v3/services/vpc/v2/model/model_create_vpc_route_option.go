package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

//
type CreateVpcRouteOption struct {
	// 路由目的地址CIDR，如192.168.200.0/24。

	Destination string `json:"destination"`
	// 功能说明：路由下一跳  取值范围：如果type为peering类型，则nexthop为peering的ID

	Nexthop string `json:"nexthop"`
	// 功能说明：路由类型  取值范围：peering

	Type CreateVpcRouteOptionType `json:"type"`
	// 请求添加路由的VPC ID

	VpcId string `json:"vpc_id"`
}

func (o CreateVpcRouteOption) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "CreateVpcRouteOption struct{}"
	}

	return strings.Join([]string{"CreateVpcRouteOption", string(data)}, " ")
}

type CreateVpcRouteOptionType struct {
	value string
}

type CreateVpcRouteOptionTypeEnum struct {
	PEERING CreateVpcRouteOptionType
}

func GetCreateVpcRouteOptionTypeEnum() CreateVpcRouteOptionTypeEnum {
	return CreateVpcRouteOptionTypeEnum{
		PEERING: CreateVpcRouteOptionType{
			value: "peering",
		},
	}
}

func (c CreateVpcRouteOptionType) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *CreateVpcRouteOptionType) UnmarshalJSON(b []byte) error {
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
