package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

//
type Port struct {
	// 端口ID

	Id string `json:"id"`
	// 功能说明：端口名称 取值范围：0~255个字符，支持中文、英文、字母、_(下划线)、-（中划线）

	Name string `json:"name"`
	// 端口所属网络的ID

	NetworkId string `json:"network_id"`
	// 功能说明：管理状态 约束：只支持true，默认为true

	AdminStateUp bool `json:"admin_state_up"`
	// 功能描述：端口MAC地址 约束：由系统分配，不支持指定

	MacAddress string `json:"mac_address"`
	// 功能说明：端口IP 例如：\"fixed_ips\": [{\"subnet_id\": \"4dc70db6-cb7f-4200-9790-a6a910776bba\", \"ip_address\": \"192.169.25.79\"}] 约束：一个端口只支持一个fixed_ip，且不支持更新。

	FixedIps []FixedIp `json:"fixed_ips"`
	// 功能说明：端口所属设备ID 约束：不支持设置和更新，由系统自动维护

	DeviceId string `json:"device_id"`
	// 功能说明：设备所属 取值范围：合法设备所属，如network:dhcp、network:VIP_PORT、network:router_interface_distributed、network:router_centralized_snat 约束：不支持设置和更新，由系统自动维护

	DeviceOwner PortDeviceOwner `json:"device_owner"`
	// 项目ID

	TenantId string `json:"tenant_id"`
	// 功能说明：端口状态，Hana硬直通虚拟机端口状态总为DOWN 取值范围：ACTIVE、BUILD、DOWN

	Status PortStatus `json:"status"`
	// 安全组的ID列表

	SecurityGroups []string `json:"security_groups"`
	// 功能说明：IP/Mac对列表 约束：IP地址不允许为 “0.0.0.0” 如果配置地址池较大（CIDR掩码小于24位），建议为该port配置一个单独的安全组。

	AllowedAddressPairs []AllowedAddressPair `json:"allowed_address_pairs"`
	// 功能说明：DHCP的扩展Option(扩展属性)

	ExtraDhcpOpts []ExtraDhcpOpt `json:"extra_dhcp_opts"`
	// 功能说明：绑定的vNIC类型 取值范围：  - normal（软交换）  - direct: SRIOV硬直通（不支持）

	BindingvnicType string `json:"binding:vnic_type"`
	// 功能说明：主网卡默认内网域名信息 约束：不支持设置和更新，由系统自动维护

	DnsAssignment []DnsAssignMent `json:"dns_assignment"`
	// 功能说明：主网卡默认内网DNS名称 约束：不支持设置和更新，由系统自动维护

	DnsName string `json:"dns_name"`

	BindingvifDetails *BindingVifDetails `json:"binding:vif_details"`
	// 功能说明：提供用户设置自定义信息(扩展属性)

	Bindingprofile *interface{} `json:"binding:profile"`
	// 功能说明：端口所属实例ID，例如RDS实例ID 约束：不支持设置和更新，由系统自动维护

	InstanceId string `json:"instance_id"`
	// 功能说明：端口所属实例类型，例如“RDS” 约束：不支持设置和更新，由系统自动维护

	InstanceType string `json:"instance_type"`
	// 功能说明：端口安全使能标记，如果不使能则安全组和dhcp防欺骗不生效 取值范围：启用（true）或禁用（false）

	PortSecurityEnabled bool `json:"port_security_enabled"`
	// 功能说明：port所属的可用分区

	ZoneId string `json:"zone_id"`
}

func (o Port) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "Port struct{}"
	}

	return strings.Join([]string{"Port", string(data)}, " ")
}

type PortDeviceOwner struct {
	value string
}

type PortDeviceOwnerEnum struct {
	NETWORKDHCP                         PortDeviceOwner
	NETWORKVIP_PORT                     PortDeviceOwner
	NETWORKROUTER_INTERFACE_DISTRIBUTED PortDeviceOwner
	NETWORKROUTER_CENTRALIZED_SNAT      PortDeviceOwner
}

func GetPortDeviceOwnerEnum() PortDeviceOwnerEnum {
	return PortDeviceOwnerEnum{
		NETWORKDHCP: PortDeviceOwner{
			value: "network:dhcp",
		},
		NETWORKVIP_PORT: PortDeviceOwner{
			value: "network:VIP_PORT",
		},
		NETWORKROUTER_INTERFACE_DISTRIBUTED: PortDeviceOwner{
			value: "network:router_interface_distributed",
		},
		NETWORKROUTER_CENTRALIZED_SNAT: PortDeviceOwner{
			value: "network:router_centralized_snat",
		},
	}
}

func (c PortDeviceOwner) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *PortDeviceOwner) UnmarshalJSON(b []byte) error {
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

type PortStatus struct {
	value string
}

type PortStatusEnum struct {
	ACTIVE PortStatus
	BUILD  PortStatus
	DOWN   PortStatus
}

func GetPortStatusEnum() PortStatusEnum {
	return PortStatusEnum{
		ACTIVE: PortStatus{
			value: "ACTIVE",
		},
		BUILD: PortStatus{
			value: "BUILD",
		},
		DOWN: PortStatus{
			value: "DOWN",
		},
	}
}

func (c PortStatus) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *PortStatus) UnmarshalJSON(b []byte) error {
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
