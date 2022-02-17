package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type ReinstallSeverMetadata struct {
	// 重装云服务器过程中注入用户数据。  支持注入文本、文本文件或gzip文件。注入内容最大长度32KB。注入内容，需要进行base64格式编码。  了解更多用户数据注入请参考[用户数据注入](https://support.huaweicloud.com/usermanual-ecs/zh-cn_topic_0032380449.html)。

	UserData *string `json:"user_data,omitempty"`
}

func (o ReinstallSeverMetadata) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ReinstallSeverMetadata struct{}"
	}

	return strings.Join([]string{"ReinstallSeverMetadata", string(data)}, " ")
}
