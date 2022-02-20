package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

//
type SubnetResult struct {
	// uuid形式的一个资源标识。

	Id string `json:"id"`
	// 功能说明：子网的状态。   取值范围：ACTIVE,UNKNOWN,ERROR       ACTIVE表示子网已挂载到ROUTER上       UNKNOWN表示子网还未挂载到ROUTER上       ERROR表示子网状态故障

	Status SubnetResultStatus `json:"status"`
}

func (o SubnetResult) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "SubnetResult struct{}"
	}

	return strings.Join([]string{"SubnetResult", string(data)}, " ")
}

type SubnetResultStatus struct {
	value string
}

type SubnetResultStatusEnum struct {
	ACTIVE  SubnetResultStatus
	UNKNOWN SubnetResultStatus
	ERROR   SubnetResultStatus
}

func GetSubnetResultStatusEnum() SubnetResultStatusEnum {
	return SubnetResultStatusEnum{
		ACTIVE: SubnetResultStatus{
			value: "ACTIVE",
		},
		UNKNOWN: SubnetResultStatus{
			value: "UNKNOWN",
		},
		ERROR: SubnetResultStatus{
			value: "ERROR",
		},
	}
}

func (c SubnetResultStatus) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *SubnetResultStatus) UnmarshalJSON(b []byte) error {
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
