package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type BatchStartServersRequest struct {
	Body *BatchStartServersRequestBody `json:"body,omitempty"`
}

func (o BatchStartServersRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "BatchStartServersRequest struct{}"
	}

	return strings.Join([]string{"BatchStartServersRequest", string(data)}, " ")
}
