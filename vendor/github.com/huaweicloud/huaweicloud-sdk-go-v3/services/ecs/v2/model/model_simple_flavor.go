package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// 云服务器规格。
type SimpleFlavor struct {
	// 云服务器规格的ID。

	Id string `json:"id"`
	// 规格相关快捷链接地址。

	Links []Link `json:"links"`
}

func (o SimpleFlavor) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "SimpleFlavor struct{}"
	}

	return strings.Join([]string{"SimpleFlavor", string(data)}, " ")
}
