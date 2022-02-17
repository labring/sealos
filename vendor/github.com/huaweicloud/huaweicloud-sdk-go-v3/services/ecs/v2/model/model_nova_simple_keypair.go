package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type NovaSimpleKeypair struct {
	// 密钥对应指纹信息。

	Fingerprint string `json:"fingerprint"`
	// 密钥名称。

	Name string `json:"name"`
	// 密钥对应publicKey信息。

	PublicKey string `json:"public_key"`
	// 密钥类型，默认“ssh”  微版本2.2以上支持

	Type *string `json:"type,omitempty"`
}

func (o NovaSimpleKeypair) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NovaSimpleKeypair struct{}"
	}

	return strings.Join([]string{"NovaSimpleKeypair", string(data)}, " ")
}
