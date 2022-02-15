package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type CreatePortResponse struct {
	Port           *Port `json:"port,omitempty"`
	HttpStatusCode int   `json:"-"`
}

func (o CreatePortResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "CreatePortResponse struct{}"
	}

	return strings.Join([]string{"CreatePortResponse", string(data)}, " ")
}
