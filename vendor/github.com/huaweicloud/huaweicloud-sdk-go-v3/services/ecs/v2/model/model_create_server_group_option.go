package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

//
type CreateServerGroupOption struct {
	// 弹性云服务器组名称，长度大于0小于256字节。

	Name string `json:"name"`
	// 与云服务器组关联的策略名称列表。包括：  - anti-affinity：此组中的弹性云服务器必须安排到不同的主机。  - affinity：此组中的弹性云服务器必须安排在同一主机上。  - soft-anti-affinity：如果可能，应将此组中的云服务器尽量安排到不同的主机上，但如果无法实现，则仍应安排它们，而不是导致生成失败。  - soft-affinity：如果可能，应将此组中的弹性云服务器尽量安排在同一主机上， 但如果无法实现，则仍应安排它们，而不是导致生成失败。    > 说明：  - 当前仅支持反亲和性anti-affinity策略。

	Policies []CreateServerGroupOptionPolicies `json:"policies"`
}

func (o CreateServerGroupOption) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "CreateServerGroupOption struct{}"
	}

	return strings.Join([]string{"CreateServerGroupOption", string(data)}, " ")
}

type CreateServerGroupOptionPolicies struct {
	value string
}

type CreateServerGroupOptionPoliciesEnum struct {
	ANTI_AFFINITY CreateServerGroupOptionPolicies
}

func GetCreateServerGroupOptionPoliciesEnum() CreateServerGroupOptionPoliciesEnum {
	return CreateServerGroupOptionPoliciesEnum{
		ANTI_AFFINITY: CreateServerGroupOptionPolicies{
			value: "anti-affinity",
		},
	}
}

func (c CreateServerGroupOptionPolicies) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *CreateServerGroupOptionPolicies) UnmarshalJSON(b []byte) error {
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
