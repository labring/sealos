package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/sdktime"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type NovaKeypairDetail struct {
	// 密钥对应publicKey信息。

	PublicKey string `json:"public_key"`
	// 密钥名称。

	Name string `json:"name"`
	// 密钥对应指纹信息。

	Fingerprint string `json:"fingerprint"`
	// 密钥创建时间。

	CreatedAt *sdktime.SdkTime `json:"created_at"`
	// 密钥删除标记。   - true，表示密钥已被删除。   - false，表示密钥未被删除。

	Deleted bool `json:"deleted"`
	// 密钥删除时间。

	DeletedAt *sdktime.SdkTime `json:"deleted_at"`
	// 密钥ID。

	Id int32 `json:"id"`
	// 密钥更新时间。

	UpdatedAt *sdktime.SdkTime `json:"updated_at"`
	// 密钥所属用户信息。

	UserId string `json:"user_id"`
	// 密钥类型，默认“ssh”  微版本2.2以上支持

	Type *string `json:"type,omitempty"`
}

func (o NovaKeypairDetail) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NovaKeypairDetail struct{}"
	}

	return strings.Join([]string{"NovaKeypairDetail", string(data)}, " ")
}
