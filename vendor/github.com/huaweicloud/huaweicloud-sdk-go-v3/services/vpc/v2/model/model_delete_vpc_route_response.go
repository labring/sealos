package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type DeleteVpcRouteResponse struct {
	HttpStatusCode int `json:"-"`
}

func (o DeleteVpcRouteResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "DeleteVpcRouteResponse struct{}"
	}

	return strings.Join([]string{"DeleteVpcRouteResponse", string(data)}, " ")
}
