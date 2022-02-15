package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type CreatePortRequest struct {
	Body *CreatePortRequestBody `json:"body,omitempty"`
}

func (o CreatePortRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "CreatePortRequest struct{}"
	}

	return strings.Join([]string{"CreatePortRequest", string(data)}, " ")
}
