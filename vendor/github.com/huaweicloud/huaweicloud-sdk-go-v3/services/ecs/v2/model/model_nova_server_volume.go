package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type NovaServerVolume struct {
	// 云磁盘ID。

	Id string `json:"id"`
	// 一个标志，指示在删除服务器时是否删除附加的卷。、  默认情况下，这是False  微版本2.3后支持

	DeleteOnTermination *bool `json:"delete_on_termination,omitempty"`
}

func (o NovaServerVolume) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NovaServerVolume struct{}"
	}

	return strings.Join([]string{"NovaServerVolume", string(data)}, " ")
}
