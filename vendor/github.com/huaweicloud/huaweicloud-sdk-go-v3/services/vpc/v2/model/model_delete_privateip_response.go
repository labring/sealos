package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type DeletePrivateipResponse struct {
	HttpStatusCode int `json:"-"`
}

func (o DeletePrivateipResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "DeletePrivateipResponse struct{}"
	}

	return strings.Join([]string{"DeletePrivateipResponse", string(data)}, " ")
}
