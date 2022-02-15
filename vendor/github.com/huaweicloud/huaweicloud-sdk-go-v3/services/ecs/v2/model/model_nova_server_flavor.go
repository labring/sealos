package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type NovaServerFlavor struct {
	// 云服务器类型ID。  微版本2.47后不支持。

	Id *string `json:"id,omitempty"`
	// 云服务器类型相关标记快捷链接信息。  微版本2.47后不支持。

	Links *[]NovaLink `json:"links,omitempty"`
	// 该云服务器规格对应的CPU核数。  在微版本2.47后支持。

	Vcpus *int32 `json:"vcpus,omitempty"`
	// 该云服务器规格对应的内存大小，单位为MB。  在微版本2.47后支持。

	Ram *int32 `json:"ram,omitempty"`
	// 该云服务器规格对应要求系统盘大小，0为不限制。  在微版本2.47后支持。

	Disk *int32 `json:"disk,omitempty"`
	// 未使用。  在微版本2.47后支持。

	Ephemeral *int32 `json:"ephemeral,omitempty"`
	// 未使用。  在微版本2.47后支持。

	Swap *int32 `json:"swap,omitempty"`
	// 云服务器规格名称。  在微版本2.47后支持。

	OriginalName *string `json:"original_name,omitempty"`
	// flavor扩展字段。  在微版本2.47后支持。

	ExtraSpecs map[string]string `json:"extra_specs,omitempty"`
}

func (o NovaServerFlavor) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NovaServerFlavor struct{}"
	}

	return strings.Join([]string{"NovaServerFlavor", string(data)}, " ")
}
