package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type ShowServerLimitsRequest struct {
}

func (o ShowServerLimitsRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ShowServerLimitsRequest struct{}"
	}

	return strings.Join([]string{"ShowServerLimitsRequest", string(data)}, " ")
}
