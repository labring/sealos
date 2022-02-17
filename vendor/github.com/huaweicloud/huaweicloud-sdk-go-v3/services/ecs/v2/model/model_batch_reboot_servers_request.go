package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type BatchRebootServersRequest struct {
	Body *BatchRebootServersRequestBody `json:"body,omitempty"`
}

func (o BatchRebootServersRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "BatchRebootServersRequest struct{}"
	}

	return strings.Join([]string{"BatchRebootServersRequest", string(data)}, " ")
}
