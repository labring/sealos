package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

//
type Subnet struct {
	// 子网ID

	Id string `json:"id"`
	// 功能说明：子网名称 取值范围：1-64个字符，支持数字、字母、中文、_(下划线)、-（中划线）、.（点）

	Name string `json:"name"`
	// 功能说明：子网描述 取值范围：0-255个字符，不能包含“<”和“>”。

	Description string `json:"description"`
	// 功能说明：子网的网段 取值范围：必须在vpc对应cidr范围内 约束：必须是cidr格式。掩码长度不能大于28

	Cidr string `json:"cidr"`
	// 功能说明：子网的网关 取值范围：子网网段中的IP地址 约束：必须是ip格式

	GatewayIp string `json:"gateway_ip"`
	// 功能说明：是否创建cidr_v6 取值范围：true（开启），false（关闭）

	Ipv6Enable bool `json:"ipv6_enable"`
	// IPv6子网的网段，如果子网为IPv4子网，则不返回此参数

	CidrV6 string `json:"cidr_v6"`
	// IPv6子网的网关，如果子网为IPv4子网，则不返回此参数

	GatewayIpV6 string `json:"gateway_ip_v6"`
	// 子网是否开启dhcp功能

	DhcpEnable bool `json:"dhcp_enable"`
	// 子网dns服务器地址1

	PrimaryDns string `json:"primary_dns"`
	// 子网dns服务器地址2

	SecondaryDns string `json:"secondary_dns"`
	// 子网dns服务器地址列表

	DnsList []string `json:"dnsList"`
	// 子网所在的可用区标识

	AvailabilityZone string `json:"availability_zone"`
	// 子网所在VPC标识

	VpcId string `json:"vpc_id"`
	// 功能说明：子网的状态 取值范围： - ACTIVE：表示子网已挂载到ROUTER上 - UNKNOWN：表示子网还未挂载到ROUTER上 - ERROR：表示子网状态故障

	Status SubnetStatus `json:"status"`
	// 对应网络（OpenStack Neutron接口）id

	NeutronNetworkId string `json:"neutron_network_id"`
	// 对应子网（OpenStack Neutron接口）id

	NeutronSubnetId string `json:"neutron_subnet_id"`
	// 对应IPv6子网（OpenStack Neutron接口）id，如果子网为IPv4子网，则不返回此参数

	NeutronSubnetIdV6 string `json:"neutron_subnet_id_v6"`
	// 子网配置的NTP地址

	ExtraDhcpOpts []ExtraDhcpOption `json:"extra_dhcp_opts"`
	// 功能说明：子网作用域 取值范围：center-表示作用域为中心；{azId}表示作用域为具体的AZ

	Scope *string `json:"scope,omitempty"`
}

func (o Subnet) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "Subnet struct{}"
	}

	return strings.Join([]string{"Subnet", string(data)}, " ")
}

type SubnetStatus struct {
	value string
}

type SubnetStatusEnum struct {
	ACTIVE  SubnetStatus
	UNKNOWN SubnetStatus
	ERROR   SubnetStatus
}

func GetSubnetStatusEnum() SubnetStatusEnum {
	return SubnetStatusEnum{
		ACTIVE: SubnetStatus{
			value: "ACTIVE",
		},
		UNKNOWN: SubnetStatus{
			value: "UNKNOWN",
		},
		ERROR: SubnetStatus{
			value: "ERROR",
		},
	}
}

func (c SubnetStatus) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *SubnetStatus) UnmarshalJSON(b []byte) error {
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
