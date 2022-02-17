package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type DeleteSubnetTagResponse struct {
	HttpStatusCode int `json:"-"`
}

func (o DeleteSubnetTagResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "DeleteSubnetTagResponse struct{}"
	}

	return strings.Join([]string{"DeleteSubnetTagResponse", string(data)}, " ")
}
