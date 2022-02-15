package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type BatchStartServersOption struct {
	// 云服务器ID列表

	Servers []ServerId `json:"servers"`
}

func (o BatchStartServersOption) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "BatchStartServersOption struct{}"
	}

	return strings.Join([]string{"BatchStartServersOption", string(data)}, " ")
}
