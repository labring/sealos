package model

import (
	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/sdktime"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"
	"strings"
)

// peering对象
type VpcPeering struct {
	// 对等连接ID

	Id string `json:"id"`
	// 功能说明：对等连接名称 取值范围：支持1~64个字符

	Name string `json:"name"`
	// 功能说明：对等连接状态 取值范围： - PENDING_ACCEPTANCE：等待接受 - REJECTED：已拒绝。 - EXPIRED：已过期。 - DELETED：已删除。 - ACTIVE：活动的。

	Status VpcPeeringStatus `json:"status"`

	RequestVpcInfo *VpcInfo `json:"request_vpc_info"`

	AcceptVpcInfo *VpcInfo `json:"accept_vpc_info"`
	// 功能说明：资源创建UTC时间 格式：yyyy-MM-ddTHH:mm:ss

	CreatedAt *sdktime.SdkTime `json:"created_at"`
	// 功能说明：资源更新UTC时间 格式：yyyy-MM-ddTHH:mm:ss

	UpdatedAt *sdktime.SdkTime `json:"updated_at"`
	// 对等连接描述

	Description string `json:"description"`
}

func (o VpcPeering) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "VpcPeering struct{}"
	}

	return strings.Join([]string{"VpcPeering", string(data)}, " ")
}

type VpcPeeringStatus struct {
	value string
}

type VpcPeeringStatusEnum struct {
	PENDING_ACCEPTANCE VpcPeeringStatus
	REJECTED           VpcPeeringStatus
	EXPIRED            VpcPeeringStatus
	DELETED            VpcPeeringStatus
	ACTIVE             VpcPeeringStatus
}

func GetVpcPeeringStatusEnum() VpcPeeringStatusEnum {
	return VpcPeeringStatusEnum{
		PENDING_ACCEPTANCE: VpcPeeringStatus{
			value: "PENDING_ACCEPTANCE",
		},
		REJECTED: VpcPeeringStatus{
			value: "REJECTED",
		},
		EXPIRED: VpcPeeringStatus{
			value: "EXPIRED",
		},
		DELETED: VpcPeeringStatus{
			value: "DELETED",
		},
		ACTIVE: VpcPeeringStatus{
			value: "ACTIVE",
		},
	}
}

func (c VpcPeeringStatus) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *VpcPeeringStatus) UnmarshalJSON(b []byte) error {
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
