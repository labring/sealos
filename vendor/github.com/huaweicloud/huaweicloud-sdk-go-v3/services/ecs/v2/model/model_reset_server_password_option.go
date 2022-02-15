package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

type ResetServerPasswordOption struct {
	// 弹性云服务器新密码。  该接口默认不做密码安全性校验；如需校验，请指定字段“is_check_password”为true。  新密码的校验规则： - 密码长度范围为8到26位。 - 允许输入的字符包括：!@%-_=+[]:./? - 禁止输入的字符包括：汉字及【】：；“”‘’、，。《》？￥…（）—— ·！~`#&^,{}*();\"'<>|\\ $ - 复杂度上必须包含大写字母（A-Z）、小写字母（a-z）、数字（0-9）、以及允许的特殊字符中的3种以上搭配 - 不能包含用户名 \"Administrator\" 和“root”及逆序字符 - 不能包含用户名 \"Administrator\" 中连续3个字符

	NewPassword string `json:"new_password"`
	// 是否检查密码的复杂度。

	IsCheckPassword *bool `json:"is_check_password,omitempty"`
}

func (o ResetServerPasswordOption) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ResetServerPasswordOption struct{}"
	}

	return strings.Join([]string{"ResetServerPasswordOption", string(data)}, " ")
}
