package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

//
type DisassociateServerVirtualIpOption struct {
	// 云服务器添加网卡的信息。  约束：解绑虚拟IP时，subnet_id为空字符串

	SubnetId DisassociateServerVirtualIpOptionSubnetId `json:"subnet_id"`
	// 网卡即将配置的虚拟IP的地址。  约束：解绑虚拟IP时，ip_address为空字符串

	IpAddress DisassociateServerVirtualIpOptionIpAddress `json:"ip_address"`
	// 虚拟IP的allowed_address_pairs属性是否添加网卡的IP/Mac对。

	ReverseBinding *bool `json:"reverse_binding,omitempty"`
}

func (o DisassociateServerVirtualIpOption) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "DisassociateServerVirtualIpOption struct{}"
	}

	return strings.Join([]string{"DisassociateServerVirtualIpOption", string(data)}, " ")
}

type DisassociateServerVirtualIpOptionSubnetId struct {
	value string
}

type DisassociateServerVirtualIpOptionSubnetIdEnum struct {
	EMPTY DisassociateServerVirtualIpOptionSubnetId
}

func GetDisassociateServerVirtualIpOptionSubnetIdEnum() DisassociateServerVirtualIpOptionSubnetIdEnum {
	return DisassociateServerVirtualIpOptionSubnetIdEnum{
		EMPTY: DisassociateServerVirtualIpOptionSubnetId{
			value: "",
		},
	}
}

func (c DisassociateServerVirtualIpOptionSubnetId) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *DisassociateServerVirtualIpOptionSubnetId) UnmarshalJSON(b []byte) error {
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

type DisassociateServerVirtualIpOptionIpAddress struct {
	value string
}

type DisassociateServerVirtualIpOptionIpAddressEnum struct {
	EMPTY DisassociateServerVirtualIpOptionIpAddress
}

func GetDisassociateServerVirtualIpOptionIpAddressEnum() DisassociateServerVirtualIpOptionIpAddressEnum {
	return DisassociateServerVirtualIpOptionIpAddressEnum{
		EMPTY: DisassociateServerVirtualIpOptionIpAddress{
			value: "",
		},
	}
}

func (c DisassociateServerVirtualIpOptionIpAddress) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *DisassociateServerVirtualIpOptionIpAddress) UnmarshalJSON(b []byte) error {
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
