package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// 弹性云服务器镜像信息。
type ServerImage struct {
	// 镜像id

	Id string `json:"id"`
}

func (o ServerImage) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ServerImage struct{}"
	}

	return strings.Join([]string{"ServerImage", string(data)}, " ")
}
