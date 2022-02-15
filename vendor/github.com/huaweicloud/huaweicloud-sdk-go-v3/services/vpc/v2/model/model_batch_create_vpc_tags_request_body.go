package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

// This is a auto create Body Object
type BatchCreateVpcTagsRequestBody struct {
	// 功能说明：操作标识 取值范围：create

	Action BatchCreateVpcTagsRequestBodyAction `json:"action"`
	// 功能说明：标签列表

	Tags []ResourceTag `json:"tags"`
}

func (o BatchCreateVpcTagsRequestBody) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "BatchCreateVpcTagsRequestBody struct{}"
	}

	return strings.Join([]string{"BatchCreateVpcTagsRequestBody", string(data)}, " ")
}

type BatchCreateVpcTagsRequestBodyAction struct {
	value string
}

type BatchCreateVpcTagsRequestBodyActionEnum struct {
	CREATE BatchCreateVpcTagsRequestBodyAction
}

func GetBatchCreateVpcTagsRequestBodyActionEnum() BatchCreateVpcTagsRequestBodyActionEnum {
	return BatchCreateVpcTagsRequestBodyActionEnum{
		CREATE: BatchCreateVpcTagsRequestBodyAction{
			value: "create",
		},
	}
}

func (c BatchCreateVpcTagsRequestBodyAction) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *BatchCreateVpcTagsRequestBodyAction) UnmarshalJSON(b []byte) error {
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
