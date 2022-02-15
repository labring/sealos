package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// 弹性云服务器调度信息。
type ServerSchedulerHints struct {
	// 反亲和性组信息。  UUID格式。

	Group *[]string `json:"group,omitempty"`
	// 在专属主机或共享池中创建弹性云服务器。默认为在共享池创建。值为： shared或dedicated。  - shared：表示共享池。 - dedicated:表示专属主机。  创建与查询此值均有效。

	Tenancy *[]string `json:"tenancy,omitempty"`
	// 专属主机ID。  此属性仅在tenancy值为dedicated时有效。  不指定此属性，系统将自动分配租户可自动放置弹性云服务器的专属主机。  创建与查询此值均有效。

	DedicatedHostId *[]string `json:"dedicated_host_id,omitempty"`
}

func (o ServerSchedulerHints) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ServerSchedulerHints struct{}"
	}

	return strings.Join([]string{"ServerSchedulerHints", string(data)}, " ")
}
