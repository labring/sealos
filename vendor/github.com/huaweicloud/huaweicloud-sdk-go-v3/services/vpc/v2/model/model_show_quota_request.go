package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

// Request Object
type ShowQuotaRequest struct {
	// 功能说明：根据type过滤查询指定类型的配额 取值范围：vpc，subnet，securityGroup，securityGroupRule，publicIp，vpn，vpngw，vpcPeer，firewall，shareBandwidth，shareBandwidthIP，loadbalancer，listener，physicalConnect，virtualInterface，vpcContainRoutetable，routetableContainRoutes

	Type *ShowQuotaRequestType `json:"type,omitempty"`
}

func (o ShowQuotaRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ShowQuotaRequest struct{}"
	}

	return strings.Join([]string{"ShowQuotaRequest", string(data)}, " ")
}

type ShowQuotaRequestType struct {
	value string
}

type ShowQuotaRequestTypeEnum struct {
	VPC                       ShowQuotaRequestType
	SUBNET                    ShowQuotaRequestType
	SECURITY_GROUP            ShowQuotaRequestType
	SECURITY_GROUP_RULE       ShowQuotaRequestType
	PUBLIC_IP                 ShowQuotaRequestType
	VPN                       ShowQuotaRequestType
	VPNGW                     ShowQuotaRequestType
	VPC_PEER                  ShowQuotaRequestType
	FIREWALL                  ShowQuotaRequestType
	SHARE_BANDWIDTH           ShowQuotaRequestType
	SHARE_BANDWIDTH_IP        ShowQuotaRequestType
	LOADBALANCER              ShowQuotaRequestType
	LISTENER                  ShowQuotaRequestType
	PHYSICAL_CONNECT          ShowQuotaRequestType
	VIRTUAL_INTERFACE         ShowQuotaRequestType
	VPC_CONTAIN_ROUTETABLE    ShowQuotaRequestType
	ROUTETABLE_CONTAIN_ROUTES ShowQuotaRequestType
}

func GetShowQuotaRequestTypeEnum() ShowQuotaRequestTypeEnum {
	return ShowQuotaRequestTypeEnum{
		VPC: ShowQuotaRequestType{
			value: "vpc",
		},
		SUBNET: ShowQuotaRequestType{
			value: "subnet",
		},
		SECURITY_GROUP: ShowQuotaRequestType{
			value: "securityGroup",
		},
		SECURITY_GROUP_RULE: ShowQuotaRequestType{
			value: "securityGroupRule",
		},
		PUBLIC_IP: ShowQuotaRequestType{
			value: "publicIp",
		},
		VPN: ShowQuotaRequestType{
			value: "vpn",
		},
		VPNGW: ShowQuotaRequestType{
			value: "vpngw",
		},
		VPC_PEER: ShowQuotaRequestType{
			value: "vpcPeer",
		},
		FIREWALL: ShowQuotaRequestType{
			value: "firewall",
		},
		SHARE_BANDWIDTH: ShowQuotaRequestType{
			value: "shareBandwidth",
		},
		SHARE_BANDWIDTH_IP: ShowQuotaRequestType{
			value: "shareBandwidthIP",
		},
		LOADBALANCER: ShowQuotaRequestType{
			value: "loadbalancer",
		},
		LISTENER: ShowQuotaRequestType{
			value: "listener",
		},
		PHYSICAL_CONNECT: ShowQuotaRequestType{
			value: "physicalConnect",
		},
		VIRTUAL_INTERFACE: ShowQuotaRequestType{
			value: "virtualInterface",
		},
		VPC_CONTAIN_ROUTETABLE: ShowQuotaRequestType{
			value: "vpcContainRoutetable",
		},
		ROUTETABLE_CONTAIN_ROUTES: ShowQuotaRequestType{
			value: "routetableContainRoutes",
		},
	}
}

func (c ShowQuotaRequestType) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *ShowQuotaRequestType) UnmarshalJSON(b []byte) error {
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
