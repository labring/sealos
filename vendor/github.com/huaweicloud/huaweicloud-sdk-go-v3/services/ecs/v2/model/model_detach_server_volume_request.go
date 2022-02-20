package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

// Request Object
type DetachServerVolumeRequest struct {
	// 云服务器ID。

	ServerId string `json:"server_id"`
	// 磁盘ID。

	VolumeId string `json:"volume_id"`
	// 是否强制卸载数据盘。  - 是，值为“1”。  - 否，值为“0”。  默认值为0。

	DeleteFlag *DetachServerVolumeRequestDeleteFlag `json:"delete_flag,omitempty"`
}

func (o DetachServerVolumeRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "DetachServerVolumeRequest struct{}"
	}

	return strings.Join([]string{"DetachServerVolumeRequest", string(data)}, " ")
}

type DetachServerVolumeRequestDeleteFlag struct {
	value string
}

type DetachServerVolumeRequestDeleteFlagEnum struct {
	E_0 DetachServerVolumeRequestDeleteFlag
	E_1 DetachServerVolumeRequestDeleteFlag
}

func GetDetachServerVolumeRequestDeleteFlagEnum() DetachServerVolumeRequestDeleteFlagEnum {
	return DetachServerVolumeRequestDeleteFlagEnum{
		E_0: DetachServerVolumeRequestDeleteFlag{
			value: "0",
		},
		E_1: DetachServerVolumeRequestDeleteFlag{
			value: "1",
		},
	}
}

func (c DetachServerVolumeRequestDeleteFlag) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *DetachServerVolumeRequestDeleteFlag) UnmarshalJSON(b []byte) error {
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
