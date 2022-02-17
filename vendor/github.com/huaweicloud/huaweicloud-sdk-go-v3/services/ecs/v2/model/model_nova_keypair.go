package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type NovaKeypair struct {
	// 密钥对应指纹信息。

	Fingerprint string `json:"fingerprint"`
	// 密钥名称。

	Name string `json:"name"`
	// 密钥对应publicKey信息。

	PublicKey string `json:"public_key"`
	// 密钥对应privateKey信息。  - 创建SSH密钥时，响应中包括private_key的信息。 - 导入SSH密钥时，响应中不包括private_key的信息。

	PrivateKey string `json:"private_key"`
	// 密钥所属用户ID。

	UserId string `json:"user_id"`
	// 密钥类型，默认“ssh”  微版本2.2以上支持

	Type *string `json:"type,omitempty"`
}

func (o NovaKeypair) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NovaKeypair struct{}"
	}

	return strings.Join([]string{"NovaKeypair", string(data)}, " ")
}
