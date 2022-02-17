package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// 待创建云服务器的网卡信息。
type PostPaidServerNic struct {
	// 待创建云服务器所在的子网信息，需要指定vpcid对应VPC下的子网ID，UUID格式。  可以通过VPC服务 [查询子网](https://apiexplorer.developer.huaweicloud.com/apiexplorer/doc?product=VPC&api=ListSubnets) 接口查询，该接口支持通过创建云服务器填写的vpcid进行过滤查询。

	SubnetId string `json:"subnet_id"`
	// 待创建云服务器网卡的IP地址，IPv4格式。  约束：  - 不填或空字符串，默认在子网（subnet）中自动分配一个未使用的IP作网卡的IP地址。 - 若指定IP地址，该IP地址必须在子网（subnet）对应的网段内，且未被使用。

	IpAddress *string `json:"ip_address,omitempty"`
	// 是否支持ipv6。  取值为true时，标识此网卡支持ipv6。

	Ipv6Enable *bool `json:"ipv6_enable,omitempty"`

	Ipv6Bandwidth *PostPaidServerIpv6Bandwidth `json:"ipv6_bandwidth,omitempty"`
}

func (o PostPaidServerNic) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "PostPaidServerNic struct{}"
	}

	return strings.Join([]string{"PostPaidServerNic", string(data)}, " ")
}
