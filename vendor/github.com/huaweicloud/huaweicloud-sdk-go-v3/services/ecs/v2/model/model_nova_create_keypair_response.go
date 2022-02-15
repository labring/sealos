package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type NovaCreateKeypairResponse struct {
	Keypair        *NovaKeypair `json:"keypair,omitempty"`
	HttpStatusCode int          `json:"-"`
}

func (o NovaCreateKeypairResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NovaCreateKeypairResponse struct{}"
	}

	return strings.Join([]string{"NovaCreateKeypairResponse", string(data)}, " ")
}
