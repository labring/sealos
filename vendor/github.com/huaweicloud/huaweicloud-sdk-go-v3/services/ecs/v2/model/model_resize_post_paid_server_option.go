package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type ResizePostPaidServerOption struct {
	// 变更后的云服务器规格ID。  可通过[查询云服务器规格变更支持列表](https://support.huaweicloud.com/api-ecs/ecs_02_0402.html)接口查询允许变更的规格列表。

	FlavorRef string `json:"flavorRef"`
	// 取值为withStopServer ，支持开机状态下变更规格。  mode取值为withStopServer时，对开机状态的云服务器执行变更规格操作，系统自动对云服务器先执行关机，再变更规格，变更成功后再执行开机。

	Mode *string `json:"mode,omitempty"`
}

func (o ResizePostPaidServerOption) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ResizePostPaidServerOption struct{}"
	}

	return strings.Join([]string{"ResizePostPaidServerOption", string(data)}, " ")
}
