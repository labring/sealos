package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type UpdateSubnetOption struct {
	// 功能说明：子网名称 取值范围：1-64，支持数字、字母、中文、_(下划线)、-（中划线）、.（点）

	Name string `json:"name"`
	// 功能说明：子网描述 取值范围：0-255个字符，不能包含“<”和“>”。

	Description *string `json:"description,omitempty"`
	// 功能说明：是否创建ipv6子网 取值范围：true（开启），false（关闭）

	Ipv6Enable *bool `json:"ipv6_enable,omitempty"`
	// 功能说明：子网是否开启dhcp功能 取值范围：true（开启），false（关闭） 约束：不填时默认为true。当设置为false时，会导致新创建的ECS无法获取IP地址，cloudinit无法注入账号密码，请谨慎操作。

	DhcpEnable *bool `json:"dhcp_enable,omitempty"`
	// 功能说明：子网dns服务器地址1 约束：ip格式 默认值：不填时为空 [内网DNS地址请参见](https://support.huaweicloud.com/dns_faq/dns_faq_002.html) [通过API获取请参见](https://support.huaweicloud.com/api-dns/dns_api_69001.html)

	PrimaryDns *string `json:"primary_dns,omitempty"`
	// 功能说明：子网dns服务器地址2 约束：ip格式 默认值：不填时为空 [内网DNS地址请参见](https://support.huaweicloud.com/dns_faq/dns_faq_002.html) [通过API获取请参见](https://support.huaweicloud.com/api-dns/dns_api_69001.html)

	SecondaryDns *string `json:"secondary_dns,omitempty"`
	// 功能说明：子网dns服务器地址的集合；如果想使用两个以上dns服务器，请使用该字段。 约束：是子网dns服务器地址1跟子网dns服务器地址2的合集的父集 默认值：不填时为空，无法使用云内网DNS功能 [内网DNS地址请参见](https://support.huaweicloud.com/dns_faq/dns_faq_002.html) [通过API获取请参见](https://support.huaweicloud.com/api-dns/dns_api_69001.html)

	DnsList *[]string `json:"dnsList,omitempty"`
	// 子网配置的NTP地址

	ExtraDhcpOpts *[]ExtraDhcpOption `json:"extra_dhcp_opts,omitempty"`
}

func (o UpdateSubnetOption) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "UpdateSubnetOption struct{}"
	}

	return strings.Join([]string{"UpdateSubnetOption", string(data)}, " ")
}
