package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type NeutronCreateSecurityGroupRequest struct {
	Body *NeutronCreateSecurityGroupRequestBody `json:"body,omitempty"`
}

func (o NeutronCreateSecurityGroupRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronCreateSecurityGroupRequest struct{}"
	}

	return strings.Join([]string{"NeutronCreateSecurityGroupRequest", string(data)}, " ")
}
