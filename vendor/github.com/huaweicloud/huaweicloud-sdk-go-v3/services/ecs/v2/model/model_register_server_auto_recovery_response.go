package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type RegisterServerAutoRecoveryResponse struct {
	HttpStatusCode int `json:"-"`
}

func (o RegisterServerAutoRecoveryResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "RegisterServerAutoRecoveryResponse struct{}"
	}

	return strings.Join([]string{"RegisterServerAutoRecoveryResponse", string(data)}, " ")
}
