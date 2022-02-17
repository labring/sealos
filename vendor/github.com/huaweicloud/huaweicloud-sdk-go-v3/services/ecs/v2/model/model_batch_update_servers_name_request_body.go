package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// This is a auto create Body Object
type BatchUpdateServersNameRequestBody struct {
	// 弹性云服务器修改后的名称。  规则如下：  只能允许包含中文汉字、大小写字母、数字及 \"-\" 、 \"_\" 、\".\" 等特殊字符，长度限制在64个字符以内。  批量修改弹性云服务器名称时，名不会自动按序增加数字尾缀。例如： 三个ECS的名称为test_0001，test_0002，test_0003，批量修改云服务器名称为develop，则修改后3个云服务器名称为develop，develop，develop。

	Name string `json:"name"`
	// 是否只预检此次请求。  - true：发送检查请求，不会修改云服务器名称。检查项包括是否填写了必需参数、请求格式、业务限制。如果检查不通过，则返回对应错误。如果检查通过，则返回正常响应信息。 - false：发送正常请求，通过检查后并且执行修改云服务器名称的请求。  默认值：false

	DryRun *bool `json:"dry_run,omitempty"`
	// 待修改的弹性云服务器ID信息。

	Servers []ServerId `json:"servers"`
}

func (o BatchUpdateServersNameRequestBody) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "BatchUpdateServersNameRequestBody struct{}"
	}

	return strings.Join([]string{"BatchUpdateServersNameRequestBody", string(data)}, " ")
}
