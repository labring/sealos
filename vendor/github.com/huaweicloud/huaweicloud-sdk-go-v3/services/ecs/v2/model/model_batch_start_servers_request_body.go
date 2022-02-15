package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// This is a auto create Body Object
type BatchStartServersRequestBody struct {
	OsStart *BatchStartServersOption `json:"os-start"`
}

func (o BatchStartServersRequestBody) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "BatchStartServersRequestBody struct{}"
	}

	return strings.Join([]string{"BatchStartServersRequestBody", string(data)}, " ")
}
