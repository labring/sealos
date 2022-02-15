package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// 冷迁移云服务器请求结构
type MigrateServerOption struct {
	// 专属主机ID。 当弹性云服务器从公共资源池迁移至专属主机上，或者弹性云服务器在专属主机之间迁移时，该字段生效。

	DedicatedHostId *string `json:"dedicated_host_id,omitempty"`
}

func (o MigrateServerOption) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "MigrateServerOption struct{}"
	}

	return strings.Join([]string{"MigrateServerOption", string(data)}, " ")
}
