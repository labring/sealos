package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//  弹性云服务器调度信息。  裸金属服务器场景不支持。
type NovaCreateServersSchedulerHint struct {
	// 反亲和性组信息。  UUID格式。

	Group *string `json:"group,omitempty"`
	// 与指定弹性云服务器满足反亲和性。   当前不支持该功能。

	DifferentHost *[]string `json:"different_host,omitempty"`
	// 与指定的弹性云服务器满足亲和性。   当前不支持该功能。

	SameHost *[]string `json:"same_host,omitempty"`
	// 将弹性云服务器scheduler到指定网段的host上，host网段的cidr。   当前不支持该功能。

	Cidr *string `json:"cidr,omitempty"`
	// 将弹性云服务器scheduler到指定网段的host上，host IP地址。   当前不支持该功能。

	BuildNearHostIp *string `json:"build_near_host_ip,omitempty"`
	// 在专属主机或共享池中创建弹性云服务器。默认为在共享池创建。 值为： shared 或dedicated。 shared：表示共享池。 dedicated:表示专属主机。 创建与查询此值均有效。

	Tenancy *string `json:"tenancy,omitempty"`
	// 专属主机ID。 此属性仅在tenancy值为dedicated时有效。 不指定此属性，系统将自动分配租户可自动放置弹性云服务器的专属主机。 创建与查询此值均有效。

	DedicatedHostId *string `json:"dedicated_host_id,omitempty"`
}

func (o NovaCreateServersSchedulerHint) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NovaCreateServersSchedulerHint struct{}"
	}

	return strings.Join([]string{"NovaCreateServersSchedulerHint", string(data)}, " ")
}
