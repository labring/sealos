package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type ShowServerGroupResponse struct {
	ServerGroup    *ShowServerGroupResult `json:"server_group,omitempty"`
	HttpStatusCode int                    `json:"-"`
}

func (o ShowServerGroupResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ShowServerGroupResponse struct{}"
	}

	return strings.Join([]string{"ShowServerGroupResponse", string(data)}, " ")
}
