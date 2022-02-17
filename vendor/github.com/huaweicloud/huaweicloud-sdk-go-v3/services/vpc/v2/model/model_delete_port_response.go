package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type DeletePortResponse struct {
	HttpStatusCode int `json:"-"`
}

func (o DeletePortResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "DeletePortResponse struct{}"
	}

	return strings.Join([]string{"DeletePortResponse", string(data)}, " ")
}
