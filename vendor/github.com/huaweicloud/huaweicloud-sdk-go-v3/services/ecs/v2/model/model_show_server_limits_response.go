package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type ShowServerLimitsResponse struct {
	Absolute       *ServerLimits `json:"absolute,omitempty"`
	HttpStatusCode int           `json:"-"`
}

func (o ShowServerLimitsResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ShowServerLimitsResponse struct{}"
	}

	return strings.Join([]string{"ShowServerLimitsResponse", string(data)}, " ")
}
