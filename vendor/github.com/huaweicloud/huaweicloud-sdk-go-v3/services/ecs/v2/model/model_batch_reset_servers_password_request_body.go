package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// This is a auto create Body Object
type BatchResetServersPasswordRequestBody struct {
	// 新密码。  当dry_run字段为true时，该字段为非必填字段，否则为必填字段。  新密码的校验规则：  - 允许输入的字符包括：!@%-_=+[]:./? - 禁止输入的字符包括：汉字及【】：；“”‘’、，。《》？￥…（）—— ·！~`#&^,{}*();\"'<>|\\ $ - 复杂度上必须包含大写字母（A-Z）、小写字母（a-z）、数字（0-9）、以及允许的特殊字符中的3种以上搭配 - 不能包含用户名 \"Administrator\" 和“root”及逆序字符 - 不能包含用户名 \"Administrator\" 中连续3个字符

	NewPassword string `json:"new_password"`
	// 是否只预检此次请求。  - true：发送检查请求，不会重置密码。检查项包括是否填写了必需参数、请求格式、业务限制。如果检查不通过，则返回对应错误。如果检查通过，则返回响应结果。 - false：发送正常请求，通过检查后并且进行重置密码请求。  默认值：false

	DryRun *bool `json:"dry_run,omitempty"`
	// 待批量重置密码的弹性云服务器ID信息。

	Servers []ServerId `json:"servers"`
}

func (o BatchResetServersPasswordRequestBody) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "BatchResetServersPasswordRequestBody struct{}"
	}

	return strings.Join([]string{"BatchResetServersPasswordRequestBody", string(data)}, " ")
}
