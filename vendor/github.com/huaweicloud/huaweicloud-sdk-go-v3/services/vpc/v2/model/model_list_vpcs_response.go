package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type ListVpcsResponse struct {
	// vpc对象列表

	Vpcs           *[]Vpc `json:"vpcs,omitempty"`
	HttpStatusCode int    `json:"-"`
}

func (o ListVpcsResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ListVpcsResponse struct{}"
	}

	return strings.Join([]string{"ListVpcsResponse", string(data)}, " ")
}
