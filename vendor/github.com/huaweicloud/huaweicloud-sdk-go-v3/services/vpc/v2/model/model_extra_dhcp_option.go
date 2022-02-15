package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

// 子网配置的NTP地址对象
type ExtraDhcpOption struct {
	// 功能说明：子网配置的NTP地址名称 约束：目前只支持字段“ntp”

	OptName ExtraDhcpOptionOptName `json:"opt_name"`
	// 功能说明：子网配置的NTP地址 约束：目前只支持IPv4地址，每个IP地址以逗号隔开，IP地址个数不能超过4个，不能存在相同地址。该字段为null表示取消该子网NTP的设置，不能为””(空字符串)。

	OptValue *string `json:"opt_value,omitempty"`
}

func (o ExtraDhcpOption) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ExtraDhcpOption struct{}"
	}

	return strings.Join([]string{"ExtraDhcpOption", string(data)}, " ")
}

type ExtraDhcpOptionOptName struct {
	value string
}

type ExtraDhcpOptionOptNameEnum struct {
	NTP ExtraDhcpOptionOptName
}

func GetExtraDhcpOptionOptNameEnum() ExtraDhcpOptionOptNameEnum {
	return ExtraDhcpOptionOptNameEnum{
		NTP: ExtraDhcpOptionOptName{
			value: "ntp",
		},
	}
}

func (c ExtraDhcpOptionOptName) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *ExtraDhcpOptionOptName) UnmarshalJSON(b []byte) error {
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
