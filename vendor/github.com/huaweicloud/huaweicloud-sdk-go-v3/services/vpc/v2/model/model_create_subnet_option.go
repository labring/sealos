package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type CreateSubnetOption struct {
	// 功能说明：子网名称 取值范围：1-64个字符，支持数字、字母、中文、_(下划线)、-（中划线）、.（点）

	Name string `json:"name"`
	// 功能说明：子网描述 取值范围：0-255个字符，不能包含“<”和“>”。

	Description *string `json:"description,omitempty"`
	// 功能说明：子网的网段 取值范围：必须在vpc对应cidr范围内 约束：必须是cidr格式。掩码长度不能大于28

	Cidr string `json:"cidr"`
	// 子网所在VPC标识

	VpcId string `json:"vpc_id"`
	// 功能说明：子网的网关 取值范围：子网网段中的IP地址 约束：必须是ip格式

	GatewayIp string `json:"gateway_ip"`
	// 功能说明：是否创建cidr_v6 取值范围：true（开启），false（关闭） 约束：不填时默认为false > 说明 该参数目前仅在“华北-北京四”区域开放，且申请IPv6公测后才可设置。

	Ipv6Enable *bool `json:"ipv6_enable,omitempty"`
	// 功能说明：子网是否开启dhcp功能 取值范围：true（开启），false（关闭） 约束：不填时默认为true。当设置为false时，会导致新创建的ECS无法获取IP地址，cloudinit无法注入账号密码，请谨慎操作。

	DhcpEnable *bool `json:"dhcp_enable,omitempty"`
	// 功能说明：子网dns服务器地址1 约束：ip格式，不支持IPv6地址 默认值：不填时为空 [内网DNS地址请参见](https://support.huaweicloud.com/dns_faq/dns_faq_002.html) [通过API获取请参见](https://support.huaweicloud.com/api-dns/dns_api_69001.html)

	PrimaryDns *string `json:"primary_dns,omitempty"`
	// 功能说明：子网dns服务器地址2 约束：ip格式，不支持IPv6地址 默认值：不填时为空 [内网DNS地址请参见](https://support.huaweicloud.com/dns_faq/dns_faq_002.html) [通过API获取请参见](https://support.huaweicloud.com/api-dns/dns_api_69001.html)

	SecondaryDns *string `json:"secondary_dns,omitempty"`
	// 功能说明：子网dns服务器地址的集合；如果想使用两个以上dns服务器，请使用该字段 约束：是子网dns服务器地址1跟子网dns服务器地址2的合集的父集，不支持IPv6地址。 默认值：不填时为空，无法使用云内网DNS功能 [内网DNS地址请参见](https://support.huaweicloud.com/dns_faq/dns_faq_002.html) [通过API获取请参见](https://support.huaweicloud.com/api-dns/dns_api_69001.html)

	DnsList *[]string `json:"dnsList,omitempty"`
	// 功能说明：子网所在的可用分区标识 约束：系统存在的可用分区标识

	AvailabilityZone *string `json:"availability_zone,omitempty"`
	// 子网配置的NTP地址

	ExtraDhcpOpts *[]ExtraDhcpOption `json:"extra_dhcp_opts,omitempty"`
}

func (o CreateSubnetOption) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "CreateSubnetOption struct{}"
	}

	return strings.Join([]string{"CreateSubnetOption", string(data)}, " ")
}
