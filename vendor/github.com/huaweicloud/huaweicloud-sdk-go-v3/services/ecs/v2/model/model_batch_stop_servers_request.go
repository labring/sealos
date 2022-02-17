package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type BatchStopServersRequest struct {
	Body *BatchStopServersRequestBody `json:"body,omitempty"`
}

func (o BatchStopServersRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "BatchStopServersRequest struct{}"
	}

	return strings.Join([]string{"BatchStopServersRequest", string(data)}, " ")
}
