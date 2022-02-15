package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

// This is a auto create Body Object
type BatchDeleteServerTagsRequestBody struct {
	// 操作标识（仅支持小写）：delete（删除）。

	Action BatchDeleteServerTagsRequestBodyAction `json:"action"`
	// 标签列表。

	Tags []ServerTag `json:"tags"`
}

func (o BatchDeleteServerTagsRequestBody) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "BatchDeleteServerTagsRequestBody struct{}"
	}

	return strings.Join([]string{"BatchDeleteServerTagsRequestBody", string(data)}, " ")
}

type BatchDeleteServerTagsRequestBodyAction struct {
	value string
}

type BatchDeleteServerTagsRequestBodyActionEnum struct {
	DELETE BatchDeleteServerTagsRequestBodyAction
}

func GetBatchDeleteServerTagsRequestBodyActionEnum() BatchDeleteServerTagsRequestBodyActionEnum {
	return BatchDeleteServerTagsRequestBodyActionEnum{
		DELETE: BatchDeleteServerTagsRequestBodyAction{
			value: "delete",
		},
	}
}

func (c BatchDeleteServerTagsRequestBodyAction) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *BatchDeleteServerTagsRequestBodyAction) UnmarshalJSON(b []byte) error {
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
