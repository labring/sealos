package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type NeutronCreateSecurityGroupRequestBody struct {
	SecurityGroup *NeutronCreateSecurityGroupOption `json:"security_group"`
}

func (o NeutronCreateSecurityGroupRequestBody) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronCreateSecurityGroupRequestBody struct{}"
	}

	return strings.Join([]string{"NeutronCreateSecurityGroupRequestBody", string(data)}, " ")
}
