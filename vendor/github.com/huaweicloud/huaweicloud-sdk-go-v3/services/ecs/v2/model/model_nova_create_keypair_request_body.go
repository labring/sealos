package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// This is a auto create Body Object
type NovaCreateKeypairRequestBody struct {
	Keypair *NovaCreateKeypairOption `json:"keypair"`
}

func (o NovaCreateKeypairRequestBody) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NovaCreateKeypairRequestBody struct{}"
	}

	return strings.Join([]string{"NovaCreateKeypairRequestBody", string(data)}, " ")
}
