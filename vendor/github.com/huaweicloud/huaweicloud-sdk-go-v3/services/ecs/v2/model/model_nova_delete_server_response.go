package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type NovaDeleteServerResponse struct {
	HttpStatusCode int `json:"-"`
}

func (o NovaDeleteServerResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NovaDeleteServerResponse struct{}"
	}

	return strings.Join([]string{"NovaDeleteServerResponse", string(data)}, " ")
}
