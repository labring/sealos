package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

// This is a auto create Body Object
type BatchDeleteVpcTagsRequestBody struct {
	// 操作标识

	Action BatchDeleteVpcTagsRequestBodyAction `json:"action"`
	// 标签列表

	Tags []ResourceTag `json:"tags"`
}

func (o BatchDeleteVpcTagsRequestBody) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "BatchDeleteVpcTagsRequestBody struct{}"
	}

	return strings.Join([]string{"BatchDeleteVpcTagsRequestBody", string(data)}, " ")
}

type BatchDeleteVpcTagsRequestBodyAction struct {
	value string
}

type BatchDeleteVpcTagsRequestBodyActionEnum struct {
	DELETE BatchDeleteVpcTagsRequestBodyAction
}

func GetBatchDeleteVpcTagsRequestBodyActionEnum() BatchDeleteVpcTagsRequestBodyActionEnum {
	return BatchDeleteVpcTagsRequestBodyActionEnum{
		DELETE: BatchDeleteVpcTagsRequestBodyAction{
			value: "delete",
		},
	}
}

func (c BatchDeleteVpcTagsRequestBodyAction) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *BatchDeleteVpcTagsRequestBodyAction) UnmarshalJSON(b []byte) error {
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
