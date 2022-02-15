package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type BatchAddServerNicOption struct {
	// 云服务器添加网卡的信息。  需要指定云服务器所属虚拟私有云下已创建的网络（network）的ID，UUID格式。 指定subnet_id时不能再指定port_id参数。

	SubnetId string `json:"subnet_id"`
	// 添加网卡的安全组信息

	SecurityGroups *[]ServerNicSecurityGroup `json:"security_groups,omitempty"`
	// IP地址，无该参数表示自动分配IP地址。

	IpAddress *string `json:"ip_address,omitempty"`
	// 是否支持ipv6。  取值为true时，标识此网卡支持ipv6。

	Ipv6Enable *bool `json:"ipv6_enable,omitempty"`

	Ipv6Bandwidth *Ipv6Bandwidth `json:"ipv6_bandwidth,omitempty"`
}

func (o BatchAddServerNicOption) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "BatchAddServerNicOption struct{}"
	}

	return strings.Join([]string{"BatchAddServerNicOption", string(data)}, " ")
}
