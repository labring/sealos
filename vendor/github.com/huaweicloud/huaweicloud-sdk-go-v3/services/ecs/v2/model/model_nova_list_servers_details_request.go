package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

// Request Object
type NovaListServersDetailsRequest struct {
	// 云服务器上次更新状态的时间戳信息。时间戳为UTC格式。

	ChangesSince *string `json:"changes-since,omitempty"`
	// 云服务器规格ID。

	Flavor *string `json:"flavor,omitempty"`
	// 镜像ID  在使用image作为条件过滤时，不能同时支持其他过滤条件和分页条件。如果同时指定image及其他条件，则以image条件为准；当条件不含image时，接口功能不受限制。

	Image *string `json:"image,omitempty"`
	// IPv4地址过滤结果，匹配规则为模糊匹配。

	Ip *string `json:"ip,omitempty"`
	// 查询返回云服务器数量限制。

	Limit *int32 `json:"limit,omitempty"`
	// 从marker指定的云服务器ID的下一条数据开始查询。

	Marker *string `json:"marker,omitempty"`
	// 云服务器名称。

	Name *string `json:"name,omitempty"`
	// 查询tag字段中不包含该值的云服务器，值为标签的Key。  > 说明： >  > 系统近期对标签功能进行了升级。如果之前添加的Tag为“Key.Value”的形式，则查询的时候需要使用“Key”来查询。 >  > 例如：之前添加的tag为“a.b”,则升级后，查询时需使用“not-tags=a”。

	NotTags *string `json:"not-tags,omitempty"`
	// 批量创建弹性云服务器时，指定返回的ID，用于查询本次批量创建的弹性云服务器。

	ReservationId *string `json:"reservation_id,omitempty"`
	// 查询结果按弹性云服务器属性排序，默认排序顺序为created_at逆序。

	SortKey *NovaListServersDetailsRequestSortKey `json:"sort_key,omitempty"`
	// 云服务器状态。  取值范围： ACTIVE， BUILD，DELETED，ERROR，HARD_REBOOT，MIGRATING，REBOOT，RESIZE，REVERT_RESIZE，SHELVED，SHELVED_OFFLOADED，SHUTOFF，UNKNOWN，VERIFY_RESIZE  直到2.37微版本，非上面范围的status字段将返回空列表，2.38之后的微版本，将返回400错误。  云服务器状态说明请参考[云服务器状态](https://support.huaweicloud.com/api-ecs/ecs_08_0002.html)。

	Status *NovaListServersDetailsRequestStatus `json:"status,omitempty"`
	// 查询tag字段中包含该值的云服务器。

	Tags *string `json:"tags,omitempty"`
	// 微版本头

	OpenStackAPIVersion *string `json:"OpenStack-API-Version,omitempty"`
}

func (o NovaListServersDetailsRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NovaListServersDetailsRequest struct{}"
	}

	return strings.Join([]string{"NovaListServersDetailsRequest", string(data)}, " ")
}

type NovaListServersDetailsRequestSortKey struct {
	value string
}

type NovaListServersDetailsRequestSortKeyEnum struct {
	CREATED_AT        NovaListServersDetailsRequestSortKey
	AVAILABILITY_ZONE NovaListServersDetailsRequestSortKey
	DISPLAY_NAME      NovaListServersDetailsRequestSortKey
	HOST              NovaListServersDetailsRequestSortKey
	INSTANCE_TYPE_ID  NovaListServersDetailsRequestSortKey
	KEY_NAME          NovaListServersDetailsRequestSortKey
	PROJECT_ID        NovaListServersDetailsRequestSortKey
	USER_ID           NovaListServersDetailsRequestSortKey
	UPDATED_AT        NovaListServersDetailsRequestSortKey
	UUID              NovaListServersDetailsRequestSortKey
	VM_STATE          NovaListServersDetailsRequestSortKey
}

func GetNovaListServersDetailsRequestSortKeyEnum() NovaListServersDetailsRequestSortKeyEnum {
	return NovaListServersDetailsRequestSortKeyEnum{
		CREATED_AT: NovaListServersDetailsRequestSortKey{
			value: "created_at",
		},
		AVAILABILITY_ZONE: NovaListServersDetailsRequestSortKey{
			value: "availability_zone",
		},
		DISPLAY_NAME: NovaListServersDetailsRequestSortKey{
			value: "display_name",
		},
		HOST: NovaListServersDetailsRequestSortKey{
			value: "host",
		},
		INSTANCE_TYPE_ID: NovaListServersDetailsRequestSortKey{
			value: "instance_type_id",
		},
		KEY_NAME: NovaListServersDetailsRequestSortKey{
			value: "key_name",
		},
		PROJECT_ID: NovaListServersDetailsRequestSortKey{
			value: "project_id",
		},
		USER_ID: NovaListServersDetailsRequestSortKey{
			value: "user_id",
		},
		UPDATED_AT: NovaListServersDetailsRequestSortKey{
			value: "updated_at",
		},
		UUID: NovaListServersDetailsRequestSortKey{
			value: "uuid",
		},
		VM_STATE: NovaListServersDetailsRequestSortKey{
			value: "vm_state",
		},
	}
}

func (c NovaListServersDetailsRequestSortKey) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *NovaListServersDetailsRequestSortKey) UnmarshalJSON(b []byte) error {
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

type NovaListServersDetailsRequestStatus struct {
	value string
}

type NovaListServersDetailsRequestStatusEnum struct {
	ACTIVE            NovaListServersDetailsRequestStatus
	BUILD             NovaListServersDetailsRequestStatus
	DELETED           NovaListServersDetailsRequestStatus
	ERROR             NovaListServersDetailsRequestStatus
	HARD_REBOOT       NovaListServersDetailsRequestStatus
	MIGRATING         NovaListServersDetailsRequestStatus
	REBOOT            NovaListServersDetailsRequestStatus
	RESIZE            NovaListServersDetailsRequestStatus
	REVERT_RESIZE     NovaListServersDetailsRequestStatus
	SHELVED           NovaListServersDetailsRequestStatus
	SHELVED_OFFLOADED NovaListServersDetailsRequestStatus
	SHUTOFF           NovaListServersDetailsRequestStatus
	UNKNOWN           NovaListServersDetailsRequestStatus
	VERIFY_RESIZE     NovaListServersDetailsRequestStatus
}

func GetNovaListServersDetailsRequestStatusEnum() NovaListServersDetailsRequestStatusEnum {
	return NovaListServersDetailsRequestStatusEnum{
		ACTIVE: NovaListServersDetailsRequestStatus{
			value: "ACTIVE",
		},
		BUILD: NovaListServersDetailsRequestStatus{
			value: "BUILD",
		},
		DELETED: NovaListServersDetailsRequestStatus{
			value: "DELETED",
		},
		ERROR: NovaListServersDetailsRequestStatus{
			value: "ERROR",
		},
		HARD_REBOOT: NovaListServersDetailsRequestStatus{
			value: "HARD_REBOOT",
		},
		MIGRATING: NovaListServersDetailsRequestStatus{
			value: "MIGRATING",
		},
		REBOOT: NovaListServersDetailsRequestStatus{
			value: "REBOOT",
		},
		RESIZE: NovaListServersDetailsRequestStatus{
			value: "RESIZE",
		},
		REVERT_RESIZE: NovaListServersDetailsRequestStatus{
			value: "REVERT_RESIZE",
		},
		SHELVED: NovaListServersDetailsRequestStatus{
			value: "SHELVED",
		},
		SHELVED_OFFLOADED: NovaListServersDetailsRequestStatus{
			value: "SHELVED_OFFLOADED",
		},
		SHUTOFF: NovaListServersDetailsRequestStatus{
			value: "SHUTOFF",
		},
		UNKNOWN: NovaListServersDetailsRequestStatus{
			value: "UNKNOWN",
		},
		VERIFY_RESIZE: NovaListServersDetailsRequestStatus{
			value: "VERIFY_RESIZE",
		},
	}
}

func (c NovaListServersDetailsRequestStatus) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *NovaListServersDetailsRequestStatus) UnmarshalJSON(b []byte) error {
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
