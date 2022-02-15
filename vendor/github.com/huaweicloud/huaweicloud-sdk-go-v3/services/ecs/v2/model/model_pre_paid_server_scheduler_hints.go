package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

//
type PrePaidServerSchedulerHints struct {
	// 云服务器组ID，UUID格式。  云服务器组的ID可以从控制台或者参考[查询云服务器组列表](https://support.huaweicloud.com/api-ecs/ecs_03_1402.html)获取。

	Group *string `json:"group,omitempty"`
	// 在指定的专属主机或者共享主机上创建弹性云服务器。参数值为shared或者dedicated。

	Tenancy *PrePaidServerSchedulerHintsTenancy `json:"tenancy,omitempty"`
	// 专属主机的ID。

	DedicatedHostId *string `json:"dedicated_host_id,omitempty"`
}

func (o PrePaidServerSchedulerHints) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "PrePaidServerSchedulerHints struct{}"
	}

	return strings.Join([]string{"PrePaidServerSchedulerHints", string(data)}, " ")
}

type PrePaidServerSchedulerHintsTenancy struct {
	value string
}

type PrePaidServerSchedulerHintsTenancyEnum struct {
	SHARED    PrePaidServerSchedulerHintsTenancy
	DEDICATED PrePaidServerSchedulerHintsTenancy
}

func GetPrePaidServerSchedulerHintsTenancyEnum() PrePaidServerSchedulerHintsTenancyEnum {
	return PrePaidServerSchedulerHintsTenancyEnum{
		SHARED: PrePaidServerSchedulerHintsTenancy{
			value: "shared",
		},
		DEDICATED: PrePaidServerSchedulerHintsTenancy{
			value: "dedicated",
		},
	}
}

func (c PrePaidServerSchedulerHintsTenancy) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *PrePaidServerSchedulerHintsTenancy) UnmarshalJSON(b []byte) error {
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
