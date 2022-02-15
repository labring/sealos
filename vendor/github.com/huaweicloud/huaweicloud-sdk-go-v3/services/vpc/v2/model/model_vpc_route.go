package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

//
type VpcRoute struct {
	// 路由ID

	Id string `json:"id"`
	// 路由目的地址CIDR，如192.168.200.0/24。

	Destination string `json:"destination"`
	// 功能说明：路由下一跳 取值范围：如果type为peering类型，则nexthop为peering的ID

	Nexthop string `json:"nexthop"`
	// 功能说明：路由类型 取值范围：peering

	Type VpcRouteType `json:"type"`
	// 请求添加路由的VPC ID

	VpcId string `json:"vpc_id"`
	// 项目ID

	TenantId string `json:"tenant_id"`
}

func (o VpcRoute) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "VpcRoute struct{}"
	}

	return strings.Join([]string{"VpcRoute", string(data)}, " ")
}

type VpcRouteType struct {
	value string
}

type VpcRouteTypeEnum struct {
	PEERING VpcRouteType
}

func GetVpcRouteTypeEnum() VpcRouteTypeEnum {
	return VpcRouteTypeEnum{
		PEERING: VpcRouteType{
			value: "peering",
		},
	}
}

func (c VpcRouteType) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *VpcRouteType) UnmarshalJSON(b []byte) error {
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
