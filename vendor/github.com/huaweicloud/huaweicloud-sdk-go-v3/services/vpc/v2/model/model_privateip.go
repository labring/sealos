package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

//
type Privateip struct {
	// 私有IP的状态  - ACTIVE：活动的  - DOWN：不可用

	Status PrivateipStatus `json:"status"`
	// 私有IP ID

	Id string `json:"id"`
	// 分配IP的子网标识

	SubnetId string `json:"subnet_id"`
	// 项目ID

	TenantId string `json:"tenant_id"`
	// 私有IP的使用者，空表示未使用 取值范围：network:dhcp，network:router_interface_distributed，compute:xxx(xxx对应具体的az名称，例如compute:aa-bb-cc表示是被aa-bb-cc上的虚拟机使用) 约束：此处的取值范围只是本服务支持的类型，其他类型未做标注

	DeviceOwner PrivateipDeviceOwner `json:"device_owner"`
	// 申请到的私有IP

	IpAddress string `json:"ip_address"`
}

func (o Privateip) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "Privateip struct{}"
	}

	return strings.Join([]string{"Privateip", string(data)}, " ")
}

type PrivateipStatus struct {
	value string
}

type PrivateipStatusEnum struct {
	ACTIVE PrivateipStatus
	DOWN   PrivateipStatus
}

func GetPrivateipStatusEnum() PrivateipStatusEnum {
	return PrivateipStatusEnum{
		ACTIVE: PrivateipStatus{
			value: "ACTIVE",
		},
		DOWN: PrivateipStatus{
			value: "DOWN",
		},
	}
}

func (c PrivateipStatus) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *PrivateipStatus) UnmarshalJSON(b []byte) error {
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

type PrivateipDeviceOwner struct {
	value string
}

type PrivateipDeviceOwnerEnum struct {
	NETWORKDHCP                         PrivateipDeviceOwner
	NETWORKROUTER_INTERFACE_DISTRIBUTED PrivateipDeviceOwner
	COMPUTEXXX                          PrivateipDeviceOwner
}

func GetPrivateipDeviceOwnerEnum() PrivateipDeviceOwnerEnum {
	return PrivateipDeviceOwnerEnum{
		NETWORKDHCP: PrivateipDeviceOwner{
			value: "network:dhcp",
		},
		NETWORKROUTER_INTERFACE_DISTRIBUTED: PrivateipDeviceOwner{
			value: "network:router_interface_distributed",
		},
		COMPUTEXXX: PrivateipDeviceOwner{
			value: "compute:xxx",
		},
	}
}

func (c PrivateipDeviceOwner) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *PrivateipDeviceOwner) UnmarshalJSON(b []byte) error {
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
