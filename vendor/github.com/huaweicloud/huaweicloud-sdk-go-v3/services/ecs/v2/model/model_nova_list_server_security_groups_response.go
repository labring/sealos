package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type NovaListServerSecurityGroupsResponse struct {
	// security_group列表

	SecurityGroups *[]NovaSecurityGroup `json:"security_groups,omitempty"`
	HttpStatusCode int                  `json:"-"`
}

func (o NovaListServerSecurityGroupsResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NovaListServerSecurityGroupsResponse struct{}"
	}

	return strings.Join([]string{"NovaListServerSecurityGroupsResponse", string(data)}, " ")
}
