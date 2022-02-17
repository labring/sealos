package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type NovaShowKeypairResponse struct {
	Keypair        *NovaKeypairDetail `json:"keypair,omitempty"`
	HttpStatusCode int                `json:"-"`
}

func (o NovaShowKeypairResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NovaShowKeypairResponse struct{}"
	}

	return strings.Join([]string{"NovaShowKeypairResponse", string(data)}, " ")
}
