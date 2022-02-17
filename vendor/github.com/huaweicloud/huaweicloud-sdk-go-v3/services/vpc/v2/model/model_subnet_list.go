package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type SubnetList struct {
	// 路由表关联的子网ID

	Id string `json:"id"`
}

func (o SubnetList) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "SubnetList struct{}"
	}

	return strings.Join([]string{"SubnetList", string(data)}, " ")
}
