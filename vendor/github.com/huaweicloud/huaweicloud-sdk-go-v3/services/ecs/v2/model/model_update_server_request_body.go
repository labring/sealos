package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// This is a auto create Body Object
type UpdateServerRequestBody struct {
	Server *UpdateServerOption `json:"server"`
}

func (o UpdateServerRequestBody) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "UpdateServerRequestBody struct{}"
	}

	return strings.Join([]string{"UpdateServerRequestBody", string(data)}, " ")
}
