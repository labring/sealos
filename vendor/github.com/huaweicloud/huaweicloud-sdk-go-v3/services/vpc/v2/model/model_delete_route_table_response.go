package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type DeleteRouteTableResponse struct {
	HttpStatusCode int `json:"-"`
}

func (o DeleteRouteTableResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "DeleteRouteTableResponse struct{}"
	}

	return strings.Join([]string{"DeleteRouteTableResponse", string(data)}, " ")
}
