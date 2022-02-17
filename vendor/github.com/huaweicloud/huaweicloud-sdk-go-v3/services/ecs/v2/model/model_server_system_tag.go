package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// 弹性云服务器系统标签。
type ServerSystemTag struct {
	// 系统标签的Key值。

	Key *string `json:"key,omitempty"`
	// 系统标签的value值。

	Value *string `json:"value,omitempty"`
}

func (o ServerSystemTag) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ServerSystemTag struct{}"
	}

	return strings.Join([]string{"ServerSystemTag", string(data)}, " ")
}
