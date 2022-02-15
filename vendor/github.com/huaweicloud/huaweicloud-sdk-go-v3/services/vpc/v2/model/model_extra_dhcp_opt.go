package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type ExtraDhcpOpt struct {
	// Option名称

	OptName *string `json:"opt_name,omitempty"`
	// Option值

	OptValue *string `json:"opt_value,omitempty"`
}

func (o ExtraDhcpOpt) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ExtraDhcpOpt struct{}"
	}

	return strings.Join([]string{"ExtraDhcpOpt", string(data)}, " ")
}
