package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

//
type NovaCreateServersResult struct {
	// 弹性云服务器uuid。

	Id string `json:"id"`
	// 弹性云服务器URI自描述信息。

	Links []NovaLink `json:"links"`
	// 弹性云服务器所在安全组。

	SecurityGroups []NovaServerSecurityGroup `json:"security_groups"`
	// diskConfig方式。  - MANUAL，镜像空间不会扩展。 - AUTO，系统盘镜像空间会自动扩展为与flavor大小一致。

	OSDCFdiskConfig NovaCreateServersResultOSDCFdiskConfig `json:"OS-DCF:diskConfig"`
	// 通过返回的reservation_id，可以过滤查询到本次创建的弹性云服务器。  > 说明： >  > 批量创建弹性云服务器时，支持使用该字段。

	ReservationId *string `json:"reservation_id,omitempty"`
	// Windows弹性云服务器Administrator用户的密码。

	AdminPass string `json:"adminPass"`
}

func (o NovaCreateServersResult) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NovaCreateServersResult struct{}"
	}

	return strings.Join([]string{"NovaCreateServersResult", string(data)}, " ")
}

type NovaCreateServersResultOSDCFdiskConfig struct {
	value string
}

type NovaCreateServersResultOSDCFdiskConfigEnum struct {
	MANUAL NovaCreateServersResultOSDCFdiskConfig
	AUTO   NovaCreateServersResultOSDCFdiskConfig
}

func GetNovaCreateServersResultOSDCFdiskConfigEnum() NovaCreateServersResultOSDCFdiskConfigEnum {
	return NovaCreateServersResultOSDCFdiskConfigEnum{
		MANUAL: NovaCreateServersResultOSDCFdiskConfig{
			value: "MANUAL",
		},
		AUTO: NovaCreateServersResultOSDCFdiskConfig{
			value: "AUTO",
		},
	}
}

func (c NovaCreateServersResultOSDCFdiskConfig) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *NovaCreateServersResultOSDCFdiskConfig) UnmarshalJSON(b []byte) error {
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
