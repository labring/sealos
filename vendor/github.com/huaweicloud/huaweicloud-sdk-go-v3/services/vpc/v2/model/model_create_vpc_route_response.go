package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type CreateVpcRouteResponse struct {
	Route          *VpcRoute `json:"route,omitempty"`
	HttpStatusCode int       `json:"-"`
}

func (o CreateVpcRouteResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "CreateVpcRouteResponse struct{}"
	}

	return strings.Join([]string{"CreateVpcRouteResponse", string(data)}, " ")
}
