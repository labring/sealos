package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// This is a auto create Body Object
type DeleteServersRequestBody struct {
	// 配置删除云服务器是否删除云服务器绑定的弹性IP。如果选择不删除，则系统仅做解绑定操作，保留弹性IP资源。 取值为true或false，默认为false。   - true：删除云服务器时会同时删除绑定在云服务器上的弹性IP。  - false：删除云服务器时，仅解绑定在云服务器上的弹性IP，不删除弹性IP

	DeletePublicip *bool `json:"delete_publicip,omitempty"`
	// 配置删除云服务器是否删除云服务器对应的数据盘，如果选择不删除，则系统仅做解绑定操作，保留云磁盘资源。 取值为false或true，默认为false。  - true：删除云服务器时会同时删除挂载在云服务器上的数据盘。 - false：删除云服务器时，仅卸载云服务器上挂载的数据盘，不删除该数据盘。

	DeleteVolume *bool `json:"delete_volume,omitempty"`
	// 所需要删除的云服务器列表。

	Servers []ServerId `json:"servers"`
}

func (o DeleteServersRequestBody) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "DeleteServersRequestBody struct{}"
	}

	return strings.Join([]string{"DeleteServersRequestBody", string(data)}, " ")
}
