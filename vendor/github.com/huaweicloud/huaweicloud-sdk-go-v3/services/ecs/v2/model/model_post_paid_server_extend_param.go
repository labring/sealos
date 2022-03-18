package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

//
type PostPaidServerExtendParam struct {
	// 计费模式：  - 0：按需计费。

	ChargingMode *int32 `json:"chargingMode,omitempty"`
	// 云服务器所在区域ID。  请参考[地区和终端节点](https://developer.huaweicloud.com/endpoint)获取。

	RegionID *string `json:"regionID,omitempty"`
	// 是否配置弹性云服务器自动恢复的功能。  - “true”：配置该功能 - “false”：不配置该功能  > 说明： >  > 此参数为boolean类型，若传入非boolean类型字符，程序将按照【“false”：不配置该功能】方式处理。 >  > 当marketType为spot时，不支持该功能。

	SupportAutoRecovery *bool `json:"support_auto_recovery,omitempty"`
	// 企业项目ID。  > 说明： >  > 关于企业项目ID的获取及企业项目特性的详细信息，请参见《[企业管理服务用户指南](https://support.huaweicloud.com/usermanual-em/zh-cn_topic_0126101490.html)》。 >  > 该字段不传（或传为字符串“0”），则将资源绑定给默认企业项目。

	EnterpriseProjectId *string `json:"enterprise_project_id,omitempty"`
	// 创建竞价实例时，需指定该参数的值为“spot”。  > 说明： >  > 当chargingMode=0时且marketType=spot时此参数生效。

	MarketType *string `json:"marketType,omitempty"`
	// 用户愿意为竞价实例每小时支付的最高价格。  > 说明： >  > 仅chargingMode=0且marketType=spot时，该参数设置后生效。 >  > 当chargingMode=0且marketType=spot时，如果不传递spotPrice，默认使用按需购买的价格作为竞价。

	SpotPrice *string `json:"spotPrice,omitempty"`
	// 是否支持先创建卷，再创建虚拟机。  “true”：配置该功能 “false”：不配置该功能

	DiskPrior *string `json:"diskPrior,omitempty"`
	// 购买的竞价实例时长。  - 仅interruption_policy=immediate 时该字段有效 。 - pot_duration_hours大于0。最大值由预测系统给出可以从flavor的extra_specs的cond:spot_block:operation:longest_duration_hours字段中查询。

	SpotDurationHours *int32 `json:"spot_duration_hours,omitempty"`
	// 竞价实例中断策略，当前支持immediate。  - 当interruption_policy=immediate时表示释放策略为立即释放。

	InterruptionPolicy *PostPaidServerExtendParamInterruptionPolicy `json:"interruption_policy,omitempty"`
	// 表示购买的“竞价实例时长”的个数。  - 仅spot_duration_hours>0 时该字段有效。 - spot_duration_hours小于6时，spot_duration_count值必须为1。 - spot_duration_hours等于6时，spot_duration_count大于等于1。  spot_duration_count的最大值由预测系统给出可以从flavor的extra_specs的cond:spot_block:operation:longest_duration_count字段中查询。

	SpotDurationCount *int32 `json:"spot_duration_count,omitempty"`
	// 云备份策略和云备份存储库详情，取值包含备份策略ID和云备份存储库ID。

	CbCsbsBackup *string `json:"CB_CSBS_BACKUP,omitempty"`
}

func (o PostPaidServerExtendParam) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "PostPaidServerExtendParam struct{}"
	}

	return strings.Join([]string{"PostPaidServerExtendParam", string(data)}, " ")
}

type PostPaidServerExtendParamInterruptionPolicy struct {
	value string
}

type PostPaidServerExtendParamInterruptionPolicyEnum struct {
	IMMEDIATE PostPaidServerExtendParamInterruptionPolicy
}

func GetPostPaidServerExtendParamInterruptionPolicyEnum() PostPaidServerExtendParamInterruptionPolicyEnum {
	return PostPaidServerExtendParamInterruptionPolicyEnum{
		IMMEDIATE: PostPaidServerExtendParamInterruptionPolicy{
			value: "immediate",
		},
	}
}

func (c PostPaidServerExtendParamInterruptionPolicy) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *PostPaidServerExtendParamInterruptionPolicy) UnmarshalJSON(b []byte) error {
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
