package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type DeleteServerGroupMemberResponse struct {
	HttpStatusCode int `json:"-"`
}

func (o DeleteServerGroupMemberResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "DeleteServerGroupMemberResponse struct{}"
	}

	return strings.Join([]string{"DeleteServerGroupMemberResponse", string(data)}, " ")
}
