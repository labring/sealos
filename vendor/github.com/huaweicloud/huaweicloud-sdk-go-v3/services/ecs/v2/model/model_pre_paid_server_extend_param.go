package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

//
type PrePaidServerExtendParam struct {
	// 计费模式。  功能说明：付费方式  取值范围：  - prePaid-预付费，即包年包月； - postPaid-后付费，即按需付费； - 默认值是postPaid  > 说明： >  > 当chargingMode为prePaid（即创建包年包月付费的云服务器），且使用SSH秘钥方式登录云服务器时，metadata 中的 op_svc_userid 字段为必选字段。

	ChargingMode *PrePaidServerExtendParamChargingMode `json:"chargingMode,omitempty"`
	// 云服务器所在区域ID。  请参考[地区和终端节点](https://developer.huaweicloud.com/endpoint)获取。

	RegionID *string `json:"regionID,omitempty"`
	// 订购周期类型。  取值范围：  - month-月 - year-年  > 说明： >  > chargingMode为prePaid时生效且为必选值。

	PeriodType *PrePaidServerExtendParamPeriodType `json:"periodType,omitempty"`
	// 订购周期数。  取值范围：  - periodType=month（周期类型为月）时，取值为[1，9]； - periodType=year（周期类型为年）时，取值为[1，3]；  > 说明： >  > chargingMode为prePaid时生效且为必选值。 >  > periodNum为正整数。

	PeriodNum *int32 `json:"periodNum,omitempty"`
	// 是否自动续订。  - “true”：自动续订 - “false”：不自动续订  > 说明： >  > chargingMode为prePaid时生效，不传该字段时默认为不自动续订。

	IsAutoRenew *PrePaidServerExtendParamIsAutoRenew `json:"isAutoRenew,omitempty"`
	// 下单订购后，是否自动从客户的账户中支付，而不需要客户手动去进行支付。  - “true”：是（自动支付） - “false”：否（需要客户手动支付）  > 说明： >  > chargingMode为prePaid时生效，不传该字段时默认为客户手动支付。

	IsAutoPay *PrePaidServerExtendParamIsAutoPay `json:"isAutoPay,omitempty"`
	// 企业项目ID。  > 说明： >  > 关于企业项目ID的获取及企业项目特性的详细信息，请参见《[企业管理服务用户指南](https://support.huaweicloud.com/usermanual-em/zh-cn_topic_0126101490.html)》。 >  > 该字段不传（或传为字符串“0”），则将资源绑定给默认企业项目。

	EnterpriseProjectId *string `json:"enterprise_project_id,omitempty"`
	// 是否配置弹性云服务器自动恢复的功能。  - “true”：配置该功能 - “false”：不配置该功能  > 说明： >  > 此参数为boolean类型，若传入非boolean类型字符，程序将按照【“false”：不配置该功能】方式处理。 >  > 当marketType为spot时，不支持该功能。

	SupportAutoRecovery *bool `json:"support_auto_recovery,omitempty"`
	// 创建竞价实例时，需指定该参数的值为“spot”。  > 说明： >  > 当chargingMode=postPaid且marketType=spot时，此参数生效。

	MarketType *string `json:"marketType,omitempty"`
	// 用户愿意为竞价实例每小时支付的最高价格。  > 说明： >  > 仅chargingMode=postPaid且marketType=spot时，该参数设置后生效。 >  > 当chargingMode=postPaid且marketType=spot时，如果不传递spotPrice或者传递一个空字符串，默认使用按需购买的价格作为竞价。

	SpotPrice *string `json:"spotPrice,omitempty"`
	// 是否支持先创建卷，再创建虚拟机。  “true”：配置该功能 “false”：不配置该功能

	DiskPrior *string `json:"diskPrior,omitempty"`
	// 购买的竞价实例时长。  - 仅interruption_policy=immediate 时该字段有效 。 - spot_duration_hours大于0。最大值由预测系统给出可以从flavor的extra_specs的cond:spot_block:operation:longest_duration_hours字段中查询。

	SpotDurationHours *int32 `json:"spot_duration_hours,omitempty"`
	// 竞价实例中断策略，当前支持immediate。  - 当interruption_policy=immediate时表示释放策略为立即释放。

	InterruptionPolicy *PrePaidServerExtendParamInterruptionPolicy `json:"interruption_policy,omitempty"`
	// 表示购买的“竞价实例时长”的个数。  - 仅spot_duration_hours>0 时该字段有效。 - spot_duration_hours小于6时，spot_duration_count值必须为1。 - spot_duration_hours等于6时，spot_duration_count大于等于1。  spot_duration_count的最大值由预测系统给出可以从flavor的extra_specs的cond:spot_block:operation:longest_duration_count字段中查询。

	SpotDurationCount *int32 `json:"spot_duration_count,omitempty"`
}

func (o PrePaidServerExtendParam) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "PrePaidServerExtendParam struct{}"
	}

	return strings.Join([]string{"PrePaidServerExtendParam", string(data)}, " ")
}

type PrePaidServerExtendParamChargingMode struct {
	value string
}

type PrePaidServerExtendParamChargingModeEnum struct {
	PRE_PAID  PrePaidServerExtendParamChargingMode
	POST_PAID PrePaidServerExtendParamChargingMode
}

func GetPrePaidServerExtendParamChargingModeEnum() PrePaidServerExtendParamChargingModeEnum {
	return PrePaidServerExtendParamChargingModeEnum{
		PRE_PAID: PrePaidServerExtendParamChargingMode{
			value: "prePaid",
		},
		POST_PAID: PrePaidServerExtendParamChargingMode{
			value: "postPaid",
		},
	}
}

func (c PrePaidServerExtendParamChargingMode) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *PrePaidServerExtendParamChargingMode) UnmarshalJSON(b []byte) error {
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

type PrePaidServerExtendParamPeriodType struct {
	value string
}

type PrePaidServerExtendParamPeriodTypeEnum struct {
	MONTH PrePaidServerExtendParamPeriodType
	YEAR  PrePaidServerExtendParamPeriodType
}

func GetPrePaidServerExtendParamPeriodTypeEnum() PrePaidServerExtendParamPeriodTypeEnum {
	return PrePaidServerExtendParamPeriodTypeEnum{
		MONTH: PrePaidServerExtendParamPeriodType{
			value: "month",
		},
		YEAR: PrePaidServerExtendParamPeriodType{
			value: "year",
		},
	}
}

func (c PrePaidServerExtendParamPeriodType) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *PrePaidServerExtendParamPeriodType) UnmarshalJSON(b []byte) error {
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

type PrePaidServerExtendParamIsAutoRenew struct {
	value string
}

type PrePaidServerExtendParamIsAutoRenewEnum struct {
	TRUE  PrePaidServerExtendParamIsAutoRenew
	FALSE PrePaidServerExtendParamIsAutoRenew
}

func GetPrePaidServerExtendParamIsAutoRenewEnum() PrePaidServerExtendParamIsAutoRenewEnum {
	return PrePaidServerExtendParamIsAutoRenewEnum{
		TRUE: PrePaidServerExtendParamIsAutoRenew{
			value: "true",
		},
		FALSE: PrePaidServerExtendParamIsAutoRenew{
			value: "false",
		},
	}
}

func (c PrePaidServerExtendParamIsAutoRenew) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *PrePaidServerExtendParamIsAutoRenew) UnmarshalJSON(b []byte) error {
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

type PrePaidServerExtendParamIsAutoPay struct {
	value string
}

type PrePaidServerExtendParamIsAutoPayEnum struct {
	TRUE  PrePaidServerExtendParamIsAutoPay
	FALSE PrePaidServerExtendParamIsAutoPay
}

func GetPrePaidServerExtendParamIsAutoPayEnum() PrePaidServerExtendParamIsAutoPayEnum {
	return PrePaidServerExtendParamIsAutoPayEnum{
		TRUE: PrePaidServerExtendParamIsAutoPay{
			value: "true",
		},
		FALSE: PrePaidServerExtendParamIsAutoPay{
			value: "false",
		},
	}
}

func (c PrePaidServerExtendParamIsAutoPay) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *PrePaidServerExtendParamIsAutoPay) UnmarshalJSON(b []byte) error {
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

type PrePaidServerExtendParamInterruptionPolicy struct {
	value string
}

type PrePaidServerExtendParamInterruptionPolicyEnum struct {
	IMMEDIATE PrePaidServerExtendParamInterruptionPolicy
}

func GetPrePaidServerExtendParamInterruptionPolicyEnum() PrePaidServerExtendParamInterruptionPolicyEnum {
	return PrePaidServerExtendParamInterruptionPolicyEnum{
		IMMEDIATE: PrePaidServerExtendParamInterruptionPolicy{
			value: "immediate",
		},
	}
}

func (c PrePaidServerExtendParamInterruptionPolicy) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *PrePaidServerExtendParamInterruptionPolicy) UnmarshalJSON(b []byte) error {
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
