package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

// Request Object
type ListResizeFlavorsRequest struct {
	// 进行规格切换的云服务器ID，UUID格式。

	InstanceUuid *string `json:"instance_uuid,omitempty"`
	// 单页面可显示的flavor条数最大值，默认是1000。

	Limit *int32 `json:"limit,omitempty"`
	// 以单页最后一条flavor的ID作为分页标记。

	Marker *string `json:"marker,omitempty"`
	// 升序/降序排序，默认值为：asc。  取值范围：  - asc：表示升序。 - desc：表示降序

	SortDir *ListResizeFlavorsRequestSortDir `json:"sort_dir,omitempty"`
	// 排序字段。  key的取值范围：  - flavorid：表示规格ID。 - sort_key的默认值为“flavorid”。 - name：表示规格名称。 - memory_mb：表示内存大小。 - vcpus：表示CPU大小。 - root_gb：表示系统盘大小。

	SortKey *ListResizeFlavorsRequestSortKey `json:"sort_key,omitempty"`
	// 进行规格切换的云服务器源规格ID。

	SourceFlavorId *string `json:"source_flavor_id,omitempty"`
	// 进行规格切换的云服务器源规格名称。

	SourceFlavorName *string `json:"source_flavor_name,omitempty"`
}

func (o ListResizeFlavorsRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ListResizeFlavorsRequest struct{}"
	}

	return strings.Join([]string{"ListResizeFlavorsRequest", string(data)}, " ")
}

type ListResizeFlavorsRequestSortDir struct {
	value string
}

type ListResizeFlavorsRequestSortDirEnum struct {
	ASC  ListResizeFlavorsRequestSortDir
	DESC ListResizeFlavorsRequestSortDir
}

func GetListResizeFlavorsRequestSortDirEnum() ListResizeFlavorsRequestSortDirEnum {
	return ListResizeFlavorsRequestSortDirEnum{
		ASC: ListResizeFlavorsRequestSortDir{
			value: "asc",
		},
		DESC: ListResizeFlavorsRequestSortDir{
			value: "desc",
		},
	}
}

func (c ListResizeFlavorsRequestSortDir) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *ListResizeFlavorsRequestSortDir) UnmarshalJSON(b []byte) error {
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

type ListResizeFlavorsRequestSortKey struct {
	value string
}

type ListResizeFlavorsRequestSortKeyEnum struct {
	FLAVORID  ListResizeFlavorsRequestSortKey
	SORT_KEY  ListResizeFlavorsRequestSortKey
	NAME      ListResizeFlavorsRequestSortKey
	MEMORY_MB ListResizeFlavorsRequestSortKey
	VCPUS     ListResizeFlavorsRequestSortKey
	ROOT_GB   ListResizeFlavorsRequestSortKey
}

func GetListResizeFlavorsRequestSortKeyEnum() ListResizeFlavorsRequestSortKeyEnum {
	return ListResizeFlavorsRequestSortKeyEnum{
		FLAVORID: ListResizeFlavorsRequestSortKey{
			value: "flavorid",
		},
		SORT_KEY: ListResizeFlavorsRequestSortKey{
			value: "sort_key",
		},
		NAME: ListResizeFlavorsRequestSortKey{
			value: "name",
		},
		MEMORY_MB: ListResizeFlavorsRequestSortKey{
			value: "memory_mb",
		},
		VCPUS: ListResizeFlavorsRequestSortKey{
			value: "vcpus",
		},
		ROOT_GB: ListResizeFlavorsRequestSortKey{
			value: "root_gb",
		},
	}
}

func (c ListResizeFlavorsRequestSortKey) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *ListResizeFlavorsRequestSortKey) UnmarshalJSON(b []byte) error {
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
