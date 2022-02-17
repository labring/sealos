package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type ShowSubnetResponse struct {
	Subnet         *Subnet `json:"subnet,omitempty"`
	HttpStatusCode int     `json:"-"`
}

func (o ShowSubnetResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ShowSubnetResponse struct{}"
	}

	return strings.Join([]string{"ShowSubnetResponse", string(data)}, " ")
}
