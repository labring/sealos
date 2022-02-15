package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type CreateSecurityGroupRequest struct {
	Body *CreateSecurityGroupRequestBody `json:"body,omitempty"`
}

func (o CreateSecurityGroupRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "CreateSecurityGroupRequest struct{}"
	}

	return strings.Join([]string{"CreateSecurityGroupRequest", string(data)}, " ")
}
