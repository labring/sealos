package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type PrePaidServerRootVolumeExtendParam struct {
	// 磁盘产品资源规格编码，如SATA，SAS和SSD。  > 说明： >  > 废弃字段。

	ResourceSpecCode *string `json:"resourceSpecCode,omitempty"`
	// 磁盘产品资源类型。  > 说明： >  > 废弃字段。

	ResourceType *string `json:"resourceType,omitempty"`
	// 整机镜像中自带的原始数据盘（简称“原数据盘”）所对应的快照ID或原始数据盘ID。  使用场景：  使用整机镜像创建云服务器，并且选择的整机镜像自带1个或者多个数据盘。  用途：  使用整机镜像创建云服务器时，系统会自动恢复整机镜像中自带数据盘（如果有）的数据，但是磁盘类型将被恢复为默认属性：普通I/O、VBD、非共享盘。此时，您可以通过snapshotID，修改指定原数据盘恢复后的磁盘类型。  > 说明： >  > - 建议对每块原数据盘都指定snapshotID，否则，未指定的原数据盘将按默认属性进行创建。 > - 如需修改磁盘大小，修改后的磁盘大小需大于等于原数据盘大小。否则，会影响原数据盘的数据恢复。  实现原理：  snapshotId是整机镜像自带原始数据盘的唯一标识，通过snapshotId可以获取原数据盘的磁盘信息，从而恢复数据盘数据。  快照ID的获取方法：  登录管理控制台，打开\"云硬盘 > 快照\"页面，根据原始数据盘的磁盘名称找到对应的快照ID。

	SnapshotId *string `json:"snapshotId,omitempty"`
}

func (o PrePaidServerRootVolumeExtendParam) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "PrePaidServerRootVolumeExtendParam struct{}"
	}

	return strings.Join([]string{"PrePaidServerRootVolumeExtendParam", string(data)}, " ")
}
