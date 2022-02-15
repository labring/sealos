package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

// Request Object
type ListPortsRequest struct {
	// 功能说明：按照name过滤查询  取值范围：最大长度不超过255

	Name *string `json:"name,omitempty"`
	// 按照port_id过滤查询

	Id *string `json:"id,omitempty"`
	// 每页返回的个数

	Limit *int32 `json:"limit,omitempty"`
	// 按照admin_state_up进行过滤

	AdminStateUp *bool `json:"admin_state_up,omitempty"`
	// 按照network_id过滤查询

	NetworkId *string `json:"network_id,omitempty"`
	// 按照mac_address过滤查询

	MacAddress *string `json:"mac_address,omitempty"`
	// 按照device_id过滤查询

	DeviceId *string `json:"device_id,omitempty"`
	// 按照device_owner过滤查询

	DeviceOwner *ListPortsRequestDeviceOwner `json:"device_owner,omitempty"`
	// 功能说明：按照status过滤查询  取值范围：ACTIVE、BUILD、DOWN

	Status *ListPortsRequestStatus `json:"status,omitempty"`
	// 分页查询起始的资源ID，为空时查询第一页

	Marker *string `json:"marker,omitempty"`
	// 按照fixed_ips=ip_address或者fixed_ips=subnet_id过滤查询

	FixedIps *string `json:"fixed_ips,omitempty"`
	// 功能说明：企业项目ID，用于基于企业项目的权限管理。  取值范围：最大长度36字节，带“-”连字符的UUID格式，或者是字符串“0”。“0”表示默认企业项目。  若需要查询当前用户所有企业项目绑定的端口，请传参all_granted_eps。

	EnterpriseProjectId *string `json:"enterprise_project_id,omitempty"`
}

func (o ListPortsRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ListPortsRequest struct{}"
	}

	return strings.Join([]string{"ListPortsRequest", string(data)}, " ")
}

type ListPortsRequestDeviceOwner struct {
	value string
}

type ListPortsRequestDeviceOwnerEnum struct {
	NETWORKDHCP                         ListPortsRequestDeviceOwner
	NETWORKVIP_PORT                     ListPortsRequestDeviceOwner
	NETWORKROUTER_INTERFACE_DISTRIBUTED ListPortsRequestDeviceOwner
	NETWORKROUTER_CENTRALIZED_SNAT      ListPortsRequestDeviceOwner
}

func GetListPortsRequestDeviceOwnerEnum() ListPortsRequestDeviceOwnerEnum {
	return ListPortsRequestDeviceOwnerEnum{
		NETWORKDHCP: ListPortsRequestDeviceOwner{
			value: "network:dhcp",
		},
		NETWORKVIP_PORT: ListPortsRequestDeviceOwner{
			value: "network:VIP_PORT",
		},
		NETWORKROUTER_INTERFACE_DISTRIBUTED: ListPortsRequestDeviceOwner{
			value: "network:router_interface_distributed",
		},
		NETWORKROUTER_CENTRALIZED_SNAT: ListPortsRequestDeviceOwner{
			value: "network:router_centralized_snat",
		},
	}
}

func (c ListPortsRequestDeviceOwner) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *ListPortsRequestDeviceOwner) UnmarshalJSON(b []byte) error {
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

type ListPortsRequestStatus struct {
	value string
}

type ListPortsRequestStatusEnum struct {
	ACTIVE ListPortsRequestStatus
	BUILD  ListPortsRequestStatus
	DOWN   ListPortsRequestStatus
}

func GetListPortsRequestStatusEnum() ListPortsRequestStatusEnum {
	return ListPortsRequestStatusEnum{
		ACTIVE: ListPortsRequestStatus{
			value: "ACTIVE",
		},
		BUILD: ListPortsRequestStatus{
			value: "BUILD",
		},
		DOWN: ListPortsRequestStatus{
			value: "DOWN",
		},
	}
}

func (c ListPortsRequestStatus) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *ListPortsRequestStatus) UnmarshalJSON(b []byte) error {
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
