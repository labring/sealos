package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

//
type NovaServerSchedulerHints struct {
	// 在指定的专属主机或者共享主机上创建弹性云服务器。 参数值为shared或者dedicated。

	Tenancy *[]NovaServerSchedulerHintsTenancy `json:"tenancy,omitempty"`
	// 专属主机ID。 此属性仅在tenancy值为dedicated时有效。

	DedicatedHostId *[]string `json:"dedicated_host_id,omitempty"`
}

func (o NovaServerSchedulerHints) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NovaServerSchedulerHints struct{}"
	}

	return strings.Join([]string{"NovaServerSchedulerHints", string(data)}, " ")
}

type NovaServerSchedulerHintsTenancy struct {
	value string
}

type NovaServerSchedulerHintsTenancyEnum struct {
	SHARED    NovaServerSchedulerHintsTenancy
	DEDICATED NovaServerSchedulerHintsTenancy
}

func GetNovaServerSchedulerHintsTenancyEnum() NovaServerSchedulerHintsTenancyEnum {
	return NovaServerSchedulerHintsTenancyEnum{
		SHARED: NovaServerSchedulerHintsTenancy{
			value: "shared",
		},
		DEDICATED: NovaServerSchedulerHintsTenancy{
			value: "dedicated",
		},
	}
}

func (c NovaServerSchedulerHintsTenancy) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *NovaServerSchedulerHintsTenancy) UnmarshalJSON(b []byte) error {
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
