package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type ShowVpcRouteResponse struct {
	Route          *VpcRoute `json:"route,omitempty"`
	HttpStatusCode int       `json:"-"`
}

func (o ShowVpcRouteResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ShowVpcRouteResponse struct{}"
	}

	return strings.Join([]string{"ShowVpcRouteResponse", string(data)}, " ")
}
