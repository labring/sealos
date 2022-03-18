package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

// This is a auto create Body Object
type BatchDeleteSubnetTagsRequestBody struct {
	// 功能说明：操作标识 取值范围：delete

	Action BatchDeleteSubnetTagsRequestBodyAction `json:"action"`
	// 标签列表

	Tags []ResourceTag `json:"tags"`
}

func (o BatchDeleteSubnetTagsRequestBody) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "BatchDeleteSubnetTagsRequestBody struct{}"
	}

	return strings.Join([]string{"BatchDeleteSubnetTagsRequestBody", string(data)}, " ")
}

type BatchDeleteSubnetTagsRequestBodyAction struct {
	value string
}

type BatchDeleteSubnetTagsRequestBodyActionEnum struct {
	DELETE BatchDeleteSubnetTagsRequestBodyAction
}

func GetBatchDeleteSubnetTagsRequestBodyActionEnum() BatchDeleteSubnetTagsRequestBodyActionEnum {
	return BatchDeleteSubnetTagsRequestBodyActionEnum{
		DELETE: BatchDeleteSubnetTagsRequestBodyAction{
			value: "delete",
		},
	}
}

func (c BatchDeleteSubnetTagsRequestBodyAction) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *BatchDeleteSubnetTagsRequestBodyAction) UnmarshalJSON(b []byte) error {
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
