package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Request Object
type CreatePrivateipRequest struct {
	Body *CreatePrivateipRequestBody `json:"body,omitempty"`
}

func (o CreatePrivateipRequest) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "CreatePrivateipRequest struct{}"
	}

	return strings.Join([]string{"CreatePrivateipRequest", string(data)}, " ")
}
