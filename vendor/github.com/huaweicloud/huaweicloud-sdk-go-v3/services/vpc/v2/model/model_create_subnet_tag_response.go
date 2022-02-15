package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type CreateSubnetTagResponse struct {
	HttpStatusCode int `json:"-"`
}

func (o CreateSubnetTagResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "CreateSubnetTagResponse struct{}"
	}

	return strings.Join([]string{"CreateSubnetTagResponse", string(data)}, " ")
}
