package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

//  扩展属性，指定弹性云服务器存储设备的v2接口。是存储资源的新版本接口，指定卷场景不能批创弹性云服务器。  裸金属服务器场景不支持。
type NovaServerBlockDeviceMapping struct {
	// 卷设备的源头类型，当前只支持volume、image、snapshot、blank类型。  当使用卷创建云服务器时，source_type设置为volume；当使用镜像创建云服务器时，source_type设置为image；当使用快照创建云服务器时，source_type设置为snapshot；当创建空数据卷时，source_type设置为blank。  - 说明： -  - 当卷设备的源头类型为snapshot时，且boot_index为0，则该快照对应的云硬盘必须为系统盘。

	SourceType NovaServerBlockDeviceMappingSourceType `json:"source_type"`
	// 卷设备的目标类型，当前仅支持volume类型。  - volume：卷。 - local：本地文件，当前不支持该类型。

	DestinationType *NovaServerBlockDeviceMappingDestinationType `json:"destination_type,omitempty"`
	// local文件系统格式，例如：swap, ext4。  当前不支持该功能。

	GuestFormat *string `json:"guest_format,omitempty"`
	// 卷设备名称。  > 说明： >  > 该字段已经废弃。 >  > 用户指定的device_name不会生效，系统会默认生成一个device_name。

	DeviceName *string `json:"device_name,omitempty"`
	// 删除弹性云服务器时，是否删除卷，默认值false。  true：删除弹性云服务器时，删除卷  false：删除弹性云服务器时，不删除卷

	DeleteOnTermination *bool `json:"delete_on_termination,omitempty"`
	// 启动标识，“0”代表启动盘，“-1“代表非启动盘。  > 说明： >  > 当卷设备的源头类型全为volume时，boot_index的值有一个为0。

	BootIndex *string `json:"boot_index,omitempty"`
	// 当source_type值是volume时，uuid为卷的uuid；  当source_type值是snapshot时，uuid为快照的uuid；  当source_type值是image时，uuid为镜像的uuid；

	Uuid *string `json:"uuid,omitempty"`
	// 卷大小，整数，在source_type是image或blank，destination_type是volume的时候必选。  单位为GB。

	VolumeSize *int32 `json:"volume_size,omitempty"`
	// 卷类型，在source_type是image，destination_type是volume时建议填写。  卷类型取值范围请参考 EVS 服务 [磁盘类型介绍](https://support.huaweicloud.com/productdesc-evs/zh-cn_topic_0044524691.html)。

	VolumeType *string `json:"volume_type,omitempty"`
}

func (o NovaServerBlockDeviceMapping) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NovaServerBlockDeviceMapping struct{}"
	}

	return strings.Join([]string{"NovaServerBlockDeviceMapping", string(data)}, " ")
}

type NovaServerBlockDeviceMappingSourceType struct {
	value string
}

type NovaServerBlockDeviceMappingSourceTypeEnum struct {
	BLANK    NovaServerBlockDeviceMappingSourceType
	SNAPSHOT NovaServerBlockDeviceMappingSourceType
	VOLUME   NovaServerBlockDeviceMappingSourceType
	IMAGE    NovaServerBlockDeviceMappingSourceType
}

func GetNovaServerBlockDeviceMappingSourceTypeEnum() NovaServerBlockDeviceMappingSourceTypeEnum {
	return NovaServerBlockDeviceMappingSourceTypeEnum{
		BLANK: NovaServerBlockDeviceMappingSourceType{
			value: "blank",
		},
		SNAPSHOT: NovaServerBlockDeviceMappingSourceType{
			value: "snapshot",
		},
		VOLUME: NovaServerBlockDeviceMappingSourceType{
			value: "volume",
		},
		IMAGE: NovaServerBlockDeviceMappingSourceType{
			value: "image",
		},
	}
}

func (c NovaServerBlockDeviceMappingSourceType) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *NovaServerBlockDeviceMappingSourceType) UnmarshalJSON(b []byte) error {
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

type NovaServerBlockDeviceMappingDestinationType struct {
	value string
}

type NovaServerBlockDeviceMappingDestinationTypeEnum struct {
	VOLUME NovaServerBlockDeviceMappingDestinationType
}

func GetNovaServerBlockDeviceMappingDestinationTypeEnum() NovaServerBlockDeviceMappingDestinationTypeEnum {
	return NovaServerBlockDeviceMappingDestinationTypeEnum{
		VOLUME: NovaServerBlockDeviceMappingDestinationType{
			value: "volume",
		},
	}
}

func (c NovaServerBlockDeviceMappingDestinationType) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *NovaServerBlockDeviceMappingDestinationType) UnmarshalJSON(b []byte) error {
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
