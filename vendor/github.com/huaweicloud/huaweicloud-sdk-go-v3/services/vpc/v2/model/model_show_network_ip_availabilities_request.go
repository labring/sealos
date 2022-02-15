package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type ShowNetworkIpAvailabilitiesRequest struct {
	// 网络ID

	NetworkId string `json:"network_id"`
}

func (o ShowNetworkIpAvailabilitiesRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ShowNetworkIpAvailabilitiesRequest struct{}"
	}

	return strings.Join([]string{"ShowNetworkIpAvailabilitiesRequest", string(data)}, " ")
}
