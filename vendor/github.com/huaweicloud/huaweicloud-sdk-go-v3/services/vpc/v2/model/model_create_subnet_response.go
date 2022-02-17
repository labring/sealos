package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type CreateSubnetResponse struct {
	Subnet         *Subnet `json:"subnet,omitempty"`
	HttpStatusCode int     `json:"-"`
}

func (o CreateSubnetResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "CreateSubnetResponse struct{}"
	}

	return strings.Join([]string{"CreateSubnetResponse", string(data)}, " ")
}
