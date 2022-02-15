package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

type GetServerRemoteConsoleOption struct {
	// 远程登录协议，请将protocol配置为“vnc”。

	Protocol GetServerRemoteConsoleOptionProtocol `json:"protocol"`
	// 远程登录的类型，请将type配置为“novnc”。

	Type GetServerRemoteConsoleOptionType `json:"type"`
}

func (o GetServerRemoteConsoleOption) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "GetServerRemoteConsoleOption struct{}"
	}

	return strings.Join([]string{"GetServerRemoteConsoleOption", string(data)}, " ")
}

type GetServerRemoteConsoleOptionProtocol struct {
	value string
}

type GetServerRemoteConsoleOptionProtocolEnum struct {
	VNC GetServerRemoteConsoleOptionProtocol
}

func GetGetServerRemoteConsoleOptionProtocolEnum() GetServerRemoteConsoleOptionProtocolEnum {
	return GetServerRemoteConsoleOptionProtocolEnum{
		VNC: GetServerRemoteConsoleOptionProtocol{
			value: "vnc",
		},
	}
}

func (c GetServerRemoteConsoleOptionProtocol) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *GetServerRemoteConsoleOptionProtocol) UnmarshalJSON(b []byte) error {
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

type GetServerRemoteConsoleOptionType struct {
	value string
}

type GetServerRemoteConsoleOptionTypeEnum struct {
	NOVNC GetServerRemoteConsoleOptionType
}

func GetGetServerRemoteConsoleOptionTypeEnum() GetServerRemoteConsoleOptionTypeEnum {
	return GetServerRemoteConsoleOptionTypeEnum{
		NOVNC: GetServerRemoteConsoleOptionType{
			value: "novnc",
		},
	}
}

func (c GetServerRemoteConsoleOptionType) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *GetServerRemoteConsoleOptionType) UnmarshalJSON(b []byte) error {
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
