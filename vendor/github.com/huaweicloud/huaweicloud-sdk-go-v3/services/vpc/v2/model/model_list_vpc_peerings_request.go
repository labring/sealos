package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

// Request Object
type ListVpcPeeringsRequest struct {
	// 每页返回的个数

	Limit *int32 `json:"limit,omitempty"`
	// 分页查询起始的资源ID，为空时查询第一页

	Marker *string `json:"marker,omitempty"`
	// 按照peering_id过滤查询

	Id *string `json:"id,omitempty"`
	// 功能说明：按照peering_name过查询  取值范围：最大长度不超过64

	Name *string `json:"name,omitempty"`
	// 根据status进行过滤  - PENDING_ACCEPTANCE：等待接受 - REJECTED：已拒绝。 - EXPIRED：已过期。 - DELETED：已删除。 - ACTIVE：活动的。

	Status *ListVpcPeeringsRequestStatus `json:"status,omitempty"`
	// 按照项目ID过滤查询

	TenantId *string `json:"tenant_id,omitempty"`
	// 根据vpc ID过滤查询

	VpcId *string `json:"vpc_id,omitempty"`
}

func (o ListVpcPeeringsRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ListVpcPeeringsRequest struct{}"
	}

	return strings.Join([]string{"ListVpcPeeringsRequest", string(data)}, " ")
}

type ListVpcPeeringsRequestStatus struct {
	value string
}

type ListVpcPeeringsRequestStatusEnum struct {
	PENDING_ACCEPTANCE ListVpcPeeringsRequestStatus
	REJECTED           ListVpcPeeringsRequestStatus
	EXPIRED            ListVpcPeeringsRequestStatus
	DELETED            ListVpcPeeringsRequestStatus
	ACTIVE             ListVpcPeeringsRequestStatus
}

func GetListVpcPeeringsRequestStatusEnum() ListVpcPeeringsRequestStatusEnum {
	return ListVpcPeeringsRequestStatusEnum{
		PENDING_ACCEPTANCE: ListVpcPeeringsRequestStatus{
			value: "PENDING_ACCEPTANCE",
		},
		REJECTED: ListVpcPeeringsRequestStatus{
			value: "REJECTED",
		},
		EXPIRED: ListVpcPeeringsRequestStatus{
			value: "EXPIRED",
		},
		DELETED: ListVpcPeeringsRequestStatus{
			value: "DELETED",
		},
		ACTIVE: ListVpcPeeringsRequestStatus{
			value: "ACTIVE",
		},
	}
}

func (c ListVpcPeeringsRequestStatus) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *ListVpcPeeringsRequestStatus) UnmarshalJSON(b []byte) error {
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
