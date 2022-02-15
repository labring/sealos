package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

//
type PrePaidServerRootVolume struct {
	// 云服务器系统盘对应的磁盘类型，需要与系统所提供的磁盘类型相匹配。  - SATA：普通IO磁盘类型。 - SAS：高IO磁盘类型。 - SSD：超高IO磁盘类型。 - co-p1：高IO (性能优化Ⅰ型) - uh-l1：超高IO (时延优化)  > 说明： >  > 对于HANA云服务器、HL1型云服务器、HL2型云服务器，需使用co-p1和uh-l1两种磁盘类型。对于其他类型的云服务器，不能使用co-p1和uh-l1两种磁盘类型。

	Volumetype PrePaidServerRootVolumeVolumetype `json:"volumetype"`
	// 系统盘大小，容量单位为GB， 输入大小范围为[1,1024]。  约束：  - 系统盘大小取值应不小于镜像支持的系统盘的最小值(镜像的min_disk属性)。 - 若该参数没有指定或者指定为0时，系统盘大小默认取值为镜像中系统盘的最小值(镜像的min_disk属性)。  > 说明：  > 镜像系统盘的最小值(镜像的min_disk属性)可在控制台中点击镜像详情查看。或通过调用“查询镜像详情（OpenStack原生）”API获取，详细操作请参考[《镜像服务API参考》](https://support.huaweicloud.com/api-ims/ims_03_0702.html)中“查询镜像详情（OpenStack原生）”章节。

	Size *int32 `json:"size,omitempty"`

	Extendparam *PrePaidServerRootVolumeExtendParam `json:"extendparam,omitempty"`
	// 云服务器系统盘对应的磁盘存储类型。 磁盘存储类型枚举值： DSS：专属存储类型

	ClusterType *PrePaidServerRootVolumeClusterType `json:"cluster_type,omitempty"`
	// 使用SDI规格创建虚拟机时请关注该参数，如果该参数值为true，说明创建的为scsi类型的卷

	ClusterId *string `json:"cluster_id,omitempty"`
	// 使用SDI规格创建虚拟机时请关注该参数，如果该参数值为true，说明创建的为scsi类型的卷  > 说明： >  > 此参数为boolean类型，若传入非boolean类型字符，程序将按照false方式处理。

	Hwpassthrough *bool `json:"hw:passthrough,omitempty"`
}

func (o PrePaidServerRootVolume) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "PrePaidServerRootVolume struct{}"
	}

	return strings.Join([]string{"PrePaidServerRootVolume", string(data)}, " ")
}

type PrePaidServerRootVolumeVolumetype struct {
	value string
}

type PrePaidServerRootVolumeVolumetypeEnum struct {
	SATA  PrePaidServerRootVolumeVolumetype
	SAS   PrePaidServerRootVolumeVolumetype
	SSD   PrePaidServerRootVolumeVolumetype
	GPSSD PrePaidServerRootVolumeVolumetype
	CO_P1 PrePaidServerRootVolumeVolumetype
	UH_L1 PrePaidServerRootVolumeVolumetype
}

func GetPrePaidServerRootVolumeVolumetypeEnum() PrePaidServerRootVolumeVolumetypeEnum {
	return PrePaidServerRootVolumeVolumetypeEnum{
		SATA: PrePaidServerRootVolumeVolumetype{
			value: "SATA",
		},
		SAS: PrePaidServerRootVolumeVolumetype{
			value: "SAS",
		},
		SSD: PrePaidServerRootVolumeVolumetype{
			value: "SSD",
		},
		GPSSD: PrePaidServerRootVolumeVolumetype{
			value: "GPSSD",
		},
		CO_P1: PrePaidServerRootVolumeVolumetype{
			value: "co-p1",
		},
		UH_L1: PrePaidServerRootVolumeVolumetype{
			value: "uh-l1",
		},
	}
}

func (c PrePaidServerRootVolumeVolumetype) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *PrePaidServerRootVolumeVolumetype) UnmarshalJSON(b []byte) error {
	myConverter := converter.StringConverterFactory("string")
	if myConverter != nil {
		val, err := myConverter.CovertStringToInterface(strings.Trim(string(b[:]), "\""))
		if err == nil {
			c.value = val.(string)
			return nil
		}
		return err
	} else {
		return errors.New("convert enum data to string error")
	}
}

type PrePaidServerRootVolumeClusterType struct {
	value string
}

type PrePaidServerRootVolumeClusterTypeEnum struct {
	DSS PrePaidServerRootVolumeClusterType
}

func GetPrePaidServerRootVolumeClusterTypeEnum() PrePaidServerRootVolumeClusterTypeEnum {
	return PrePaidServerRootVolumeClusterTypeEnum{
		DSS: PrePaidServerRootVolumeClusterType{
			value: "DSS",
		},
	}
}

func (c PrePaidServerRootVolumeClusterType) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *PrePaidServerRootVolumeClusterType) UnmarshalJSON(b []byte) error {
	myConverter := converter.StringConverterFactory("string")
	if myConverter != nil {
		val, err := myConverter.CovertStringToInterface(strings.Trim(string(b[:]), "\""))
		if err == nil {
			c.value = val.(string)
			return nil
		}
		return err
	} else {
		return errors.New("convert enum data to string error")
	}
}
