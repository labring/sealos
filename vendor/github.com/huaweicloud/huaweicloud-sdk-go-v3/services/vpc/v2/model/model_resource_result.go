package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

//
type ResourceResult struct {
	// 功能说明：根据type过滤查询指定类型的配额  取值范围：vpc，subnet，securityGroup，securityGroupRule，publicIp，vpn，vpngw，vpcPeer，firewall，shareBandwidth，shareBandwidthIP，loadbalancer，listener，physicalConnect，virtualInterface，vpcContainRoutetable，routetableContainRoutes

	Type ResourceResultType `json:"type"`
	// 功能说明：已创建的资源个数  取值范围：0~quota数

	Used int32 `json:"used"`
	// 功能说明：资源的最大配额数  取值范围：各类型资源默认配额数~Integer最大值

	Quota int32 `json:"quota"`
	// 允许修改的配额最小值

	Min int32 `json:"min"`
}

func (o ResourceResult) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ResourceResult struct{}"
	}

	return strings.Join([]string{"ResourceResult", string(data)}, " ")
}

type ResourceResultType struct {
	value string
}

type ResourceResultTypeEnum struct {
	VPC                       ResourceResultType
	SUBNET                    ResourceResultType
	SECURITY_GROUP            ResourceResultType
	SECURITY_GROUP_RULE       ResourceResultType
	PUBLIC_IP                 ResourceResultType
	VPN                       ResourceResultType
	VPNGW                     ResourceResultType
	VPC_PEER                  ResourceResultType
	FIREWALL                  ResourceResultType
	SHARE_BANDWIDTH           ResourceResultType
	SHARE_BANDWIDTH_IP        ResourceResultType
	LOADBALANCER              ResourceResultType
	LISTENER                  ResourceResultType
	PHYSICAL_CONNECT          ResourceResultType
	VIRTUAL_INTERFACE         ResourceResultType
	VPC_CONTAIN_ROUTETABLE    ResourceResultType
	ROUTETABLE_CONTAIN_ROUTES ResourceResultType
}

func GetResourceResultTypeEnum() ResourceResultTypeEnum {
	return ResourceResultTypeEnum{
		VPC: ResourceResultType{
			value: "vpc",
		},
		SUBNET: ResourceResultType{
			value: "subnet",
		},
		SECURITY_GROUP: ResourceResultType{
			value: "securityGroup",
		},
		SECURITY_GROUP_RULE: ResourceResultType{
			value: "securityGroupRule",
		},
		PUBLIC_IP: ResourceResultType{
			value: "publicIp",
		},
		VPN: ResourceResultType{
			value: "vpn",
		},
		VPNGW: ResourceResultType{
			value: "vpngw",
		},
		VPC_PEER: ResourceResultType{
			value: "vpcPeer",
		},
		FIREWALL: ResourceResultType{
			value: "firewall",
		},
		SHARE_BANDWIDTH: ResourceResultType{
			value: "shareBandwidth",
		},
		SHARE_BANDWIDTH_IP: ResourceResultType{
			value: "shareBandwidthIP",
		},
		LOADBALANCER: ResourceResultType{
			value: "loadbalancer",
		},
		LISTENER: ResourceResultType{
			value: "listener",
		},
		PHYSICAL_CONNECT: ResourceResultType{
			value: "physicalConnect",
		},
		VIRTUAL_INTERFACE: ResourceResultType{
			value: "virtualInterface",
		},
		VPC_CONTAIN_ROUTETABLE: ResourceResultType{
			value: "vpcContainRoutetable",
		},
		ROUTETABLE_CONTAIN_ROUTES: ResourceResultType{
			value: "routetableContainRoutes",
		},
	}
}

func (c ResourceResultType) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *ResourceResultType) UnmarshalJSON(b []byte) error {
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
