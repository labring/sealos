package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type ShowResetPasswordFlagResponse struct {
	// 是否支持重置密码。  - True：支持一键重置密码。  - False：不支持一键重置密码。

	ResetpwdFlag   *string `json:"resetpwd_flag,omitempty"`
	HttpStatusCode int     `json:"-"`
}

func (o ShowResetPasswordFlagResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ShowResetPasswordFlagResponse struct{}"
	}

	return strings.Join([]string{"ShowResetPasswordFlagResponse", string(data)}, " ")
}
