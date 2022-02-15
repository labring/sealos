package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type ShowPortResponse struct {
	Port           *Port `json:"port,omitempty"`
	HttpStatusCode int   `json:"-"`
}

func (o ShowPortResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ShowPortResponse struct{}"
	}

	return strings.Join([]string{"ShowPortResponse", string(data)}, " ")
}
