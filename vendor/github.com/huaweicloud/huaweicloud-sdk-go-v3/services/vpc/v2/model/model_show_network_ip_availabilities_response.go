package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type ShowNetworkIpAvailabilitiesResponse struct {
	NetworkIpAvailability *NetworkIpAvailability `json:"network_ip_availability,omitempty"`
	HttpStatusCode        int                    `json:"-"`
}

func (o ShowNetworkIpAvailabilitiesResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ShowNetworkIpAvailabilitiesResponse struct{}"
	}

	return strings.Join([]string{"ShowNetworkIpAvailabilitiesResponse", string(data)}, " ")
}
