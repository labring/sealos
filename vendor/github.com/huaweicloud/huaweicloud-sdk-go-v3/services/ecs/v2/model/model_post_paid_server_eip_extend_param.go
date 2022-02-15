package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

//
type PostPaidServerEipExtendParam struct {
	// 公网IP的计费模式。  取值范围：  - prePaid-预付费，即包年包月； - postPaid-后付费，即按需付费；  > 说明： >  > 如果bandwidth对象中share_type是WHOLE且id有值，弹性IP只能创建为按需付费的，故该参数传参“prePaid”无效。

	ChargingMode *PostPaidServerEipExtendParamChargingMode `json:"chargingMode,omitempty"`
}

func (o PostPaidServerEipExtendParam) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "PostPaidServerEipExtendParam struct{}"
	}

	return strings.Join([]string{"PostPaidServerEipExtendParam", string(data)}, " ")
}

type PostPaidServerEipExtendParamChargingMode struct {
	value string
}

type PostPaidServerEipExtendParamChargingModeEnum struct {
	PRE_PAID  PostPaidServerEipExtendParamChargingMode
	POST_PAID PostPaidServerEipExtendParamChargingMode
}

func GetPostPaidServerEipExtendParamChargingModeEnum() PostPaidServerEipExtendParamChargingModeEnum {
	return PostPaidServerEipExtendParamChargingModeEnum{
		PRE_PAID: PostPaidServerEipExtendParamChargingMode{
			value: "prePaid",
		},
		POST_PAID: PostPaidServerEipExtendParamChargingMode{
			value: "postPaid",
		},
	}
}

func (c PostPaidServerEipExtendParamChargingMode) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *PostPaidServerEipExtendParamChargingMode) UnmarshalJSON(b []byte) error {
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
