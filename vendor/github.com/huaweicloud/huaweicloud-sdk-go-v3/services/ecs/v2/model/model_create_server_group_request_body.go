package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// This is a auto create Body Object
type CreateServerGroupRequestBody struct {
	ServerGroup *CreateServerGroupOption `json:"server_group"`
}

func (o CreateServerGroupRequestBody) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "CreateServerGroupRequestBody struct{}"
	}

	return strings.Join([]string{"CreateServerGroupRequestBody", string(data)}, " ")
}
