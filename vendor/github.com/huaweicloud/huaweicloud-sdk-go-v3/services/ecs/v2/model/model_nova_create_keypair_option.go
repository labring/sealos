package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

//
type NovaCreateKeypairOption struct {
	// 导入的公钥信息。  建议导入的公钥长度不大于1024字节。  说明：  - 长度超过1024字节会导致云服务器注入该密钥失败。

	PublicKey *string `json:"public_key,omitempty"`
	// 密钥类型，值为“ssh”或“x509”。  说明：  - 微版本2.2支持。

	Type *NovaCreateKeypairOptionType `json:"type,omitempty"`
	// 密钥名称。  新创建的密钥名称不能和已有密钥名称相同。

	Name string `json:"name"`
	// 密钥的用户ID。  说明：  - 微版本2.10支持。

	UserId *string `json:"user_id,omitempty"`
}

func (o NovaCreateKeypairOption) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NovaCreateKeypairOption struct{}"
	}

	return strings.Join([]string{"NovaCreateKeypairOption", string(data)}, " ")
}

type NovaCreateKeypairOptionType struct {
	value string
}

type NovaCreateKeypairOptionTypeEnum struct {
	SSH  NovaCreateKeypairOptionType
	X509 NovaCreateKeypairOptionType
}

func GetNovaCreateKeypairOptionTypeEnum() NovaCreateKeypairOptionTypeEnum {
	return NovaCreateKeypairOptionTypeEnum{
		SSH: NovaCreateKeypairOptionType{
			value: "ssh",
		},
		X509: NovaCreateKeypairOptionType{
			value: "x509",
		},
	}
}

func (c NovaCreateKeypairOptionType) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *NovaCreateKeypairOptionType) UnmarshalJSON(b []byte) error {
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
