package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

// This is a auto create Body Object
type ListSubnetsByTagsRequestBody struct {
	// 功能说明：操作标识 取值范围：filter(过滤)，count(查询总条数)

	Action ListSubnetsByTagsRequestBodyAction `json:"action"`
	// 功能说明：查询记录数 取值范围：1-1000 约束：action为count时此参数不生效；action为filter时默认为1000

	Limit *int32 `json:"limit,omitempty"`
	// 功能说明：索引位置， 从offset指定的下一条数据开始查询。 查询第一页数据时，不需要传入此参数，查询后续页码数据时，将查询前一页数据时响应体中的值带入此参数 约束：action为count时无此参数；action为filter时默认为0；必须为数字，不能为负数

	Offset *int32 `json:"offset,omitempty"`
	// 功能说明：搜索字段，key为要匹配的字段，value为匹配的值 约束：当前仅支持resource_name

	Matches *[]Match `json:"matches,omitempty"`
	// 包含标签，最多包含10个key，每个key下面的value最多10个，结构体不能缺失，key不能为空或者空字符串。Key不能重复，同一个key中values不能重复

	Tags *[]ListTag `json:"tags,omitempty"`
}

func (o ListSubnetsByTagsRequestBody) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ListSubnetsByTagsRequestBody struct{}"
	}

	return strings.Join([]string{"ListSubnetsByTagsRequestBody", string(data)}, " ")
}

type ListSubnetsByTagsRequestBodyAction struct {
	value string
}

type ListSubnetsByTagsRequestBodyActionEnum struct {
	FILTER ListSubnetsByTagsRequestBodyAction
	COUNT  ListSubnetsByTagsRequestBodyAction
}

func GetListSubnetsByTagsRequestBodyActionEnum() ListSubnetsByTagsRequestBodyActionEnum {
	return ListSubnetsByTagsRequestBodyActionEnum{
		FILTER: ListSubnetsByTagsRequestBodyAction{
			value: "filter",
		},
		COUNT: ListSubnetsByTagsRequestBodyAction{
			value: "count",
		},
	}
}

func (c ListSubnetsByTagsRequestBodyAction) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *ListSubnetsByTagsRequestBodyAction) UnmarshalJSON(b []byte) error {
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
