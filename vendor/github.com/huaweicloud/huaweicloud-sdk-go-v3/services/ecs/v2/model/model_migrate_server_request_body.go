package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// This is a auto create Body Object
type MigrateServerRequestBody struct {
	Migrate *MigrateServerOption `json:"migrate"`
}

func (o MigrateServerRequestBody) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "MigrateServerRequestBody struct{}"
	}

	return strings.Join([]string{"MigrateServerRequestBody", string(data)}, " ")
}
