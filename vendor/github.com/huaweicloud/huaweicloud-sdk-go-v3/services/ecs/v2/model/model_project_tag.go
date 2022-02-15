package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// 项目标签列表。
type ProjectTag struct {
	// 键。  - 最大长度36个unicode字符。  - 只能包含数字、字母、中划线“-”、下划线“_”。  - 字符集：A-Z，a-z ， 0-9，‘-’，‘_’，UNICODE字符（\\u4E00-\\u9FFF）。  - 不能包含以下ASCII非打印字符：“=”,“*”,“<”,“>”,“\\”,“|”,“/”,“,”。  - 标签的键必须唯一且输入不能为空。

	Key string `json:"key"`
	// 值。  - 每个值最大长度43个unicode字符。  - 可以为空字符串。  - 只能包含数字、字母、中划线“-”、下划线“_”。  - 字符集：A-Z，a-z ， 0-9，‘.’，‘-’，‘_’，UNICODE字符（\\u4E00-\\u9FFF）。  - 不能包含以下ASCII非打印字符：“=”,“*”,“<”,“>”,“\\”,“|”,“/”,“,”。

	Values *[]string `json:"values,omitempty"`
}

func (o ProjectTag) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ProjectTag struct{}"
	}

	return strings.Join([]string{"ProjectTag", string(data)}, " ")
}
