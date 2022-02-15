package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type ShowPrivateipResponse struct {
	Privateip      *Privateip `json:"privateip,omitempty"`
	HttpStatusCode int        `json:"-"`
}

func (o ShowPrivateipResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ShowPrivateipResponse struct{}"
	}

	return strings.Join([]string{"ShowPrivateipResponse", string(data)}, " ")
}
