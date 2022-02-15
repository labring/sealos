package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type PostPaidServerSchedulerHints struct {
	// 云服务器组ID，UUID格式。  云服务器组的ID可以从控制台或者参考[查询云服务器组列表](https://support.huaweicloud.com/api-ecs/ecs_03_1402.html)获取。

	Group *string `json:"group,omitempty"`
	// 专属主机的ID。专属主机的ID仅在tenancy为dedicated时生效。

	DedicatedHostId *string `json:"dedicated_host_id,omitempty"`
	// 在指定的专属主机或者共享主机上创建弹性云服务器云主机。参数值为shared或者dedicated。

	Tenancy *string `json:"tenancy,omitempty"`
}

func (o PostPaidServerSchedulerHints) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "PostPaidServerSchedulerHints struct{}"
	}

	return strings.Join([]string{"PostPaidServerSchedulerHints", string(data)}, " ")
}
