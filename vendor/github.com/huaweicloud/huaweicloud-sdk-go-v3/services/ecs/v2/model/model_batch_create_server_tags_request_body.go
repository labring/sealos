package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

// This is a auto create Body Object
type BatchCreateServerTagsRequestBody struct {
	// 操作标识（仅支持小写）：create（创建）。

	Action BatchCreateServerTagsRequestBodyAction `json:"action"`
	// 标签列表。

	Tags []ServerTag `json:"tags"`
}

func (o BatchCreateServerTagsRequestBody) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "BatchCreateServerTagsRequestBody struct{}"
	}

	return strings.Join([]string{"BatchCreateServerTagsRequestBody", string(data)}, " ")
}

type BatchCreateServerTagsRequestBodyAction struct {
	value string
}

type BatchCreateServerTagsRequestBodyActionEnum struct {
	CREATE BatchCreateServerTagsRequestBodyAction
}

func GetBatchCreateServerTagsRequestBodyActionEnum() BatchCreateServerTagsRequestBodyActionEnum {
	return BatchCreateServerTagsRequestBodyActionEnum{
		CREATE: BatchCreateServerTagsRequestBodyAction{
			value: "create",
		},
	}
}

func (c BatchCreateServerTagsRequestBodyAction) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *BatchCreateServerTagsRequestBodyAction) UnmarshalJSON(b []byte) error {
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
