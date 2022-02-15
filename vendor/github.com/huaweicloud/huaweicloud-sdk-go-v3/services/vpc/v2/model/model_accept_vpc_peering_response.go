package model

import (
	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/sdktime"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"
	"strings"
)

// Response Object
type AcceptVpcPeeringResponse struct {
	// 对等连接ID

	Id *string `json:"id,omitempty"`
	// 功能说明：对等连接名称 取值范围：支持1~64个字符

	Name *string `json:"name,omitempty"`
	// 功能说明：对等连接状态 取值范围： - PENDING_ACCEPTANCE：等待接受 - REJECTED：已拒绝。 - EXPIRED：已过期。 - DELETED：已删除。 - ACTIVE：活动的。

	Status *AcceptVpcPeeringResponseStatus `json:"status,omitempty"`

	RequestVpcInfo *VpcInfo `json:"request_vpc_info,omitempty"`

	AcceptVpcInfo *VpcInfo `json:"accept_vpc_info,omitempty"`
	// 功能说明：资源创建UTC时间 格式：yyyy-MM-ddTHH:mm:ss

	CreatedAt *sdktime.SdkTime `json:"created_at,omitempty"`
	// 功能说明：资源更新UTC时间 格式：yyyy-MM-ddTHH:mm:ss

	UpdatedAt *sdktime.SdkTime `json:"updated_at,omitempty"`
	// 对等连接描述

	Description    *string `json:"description,omitempty"`
	HttpStatusCode int     `json:"-"`
}

func (o AcceptVpcPeeringResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "AcceptVpcPeeringResponse struct{}"
	}

	return strings.Join([]string{"AcceptVpcPeeringResponse", string(data)}, " ")
}

type AcceptVpcPeeringResponseStatus struct {
	value string
}

type AcceptVpcPeeringResponseStatusEnum struct {
	PENDING_ACCEPTANCE AcceptVpcPeeringResponseStatus
	REJECTED           AcceptVpcPeeringResponseStatus
	EXPIRED            AcceptVpcPeeringResponseStatus
	DELETED            AcceptVpcPeeringResponseStatus
	ACTIVE             AcceptVpcPeeringResponseStatus
}

func GetAcceptVpcPeeringResponseStatusEnum() AcceptVpcPeeringResponseStatusEnum {
	return AcceptVpcPeeringResponseStatusEnum{
		PENDING_ACCEPTANCE: AcceptVpcPeeringResponseStatus{
			value: "PENDING_ACCEPTANCE",
		},
		REJECTED: AcceptVpcPeeringResponseStatus{
			value: "REJECTED",
		},
		EXPIRED: AcceptVpcPeeringResponseStatus{
			value: "EXPIRED",
		},
		DELETED: AcceptVpcPeeringResponseStatus{
			value: "DELETED",
		},
		ACTIVE: AcceptVpcPeeringResponseStatus{
			value: "ACTIVE",
		},
	}
}

func (c AcceptVpcPeeringResponseStatus) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *AcceptVpcPeeringResponseStatus) UnmarshalJSON(b []byte) error {
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
