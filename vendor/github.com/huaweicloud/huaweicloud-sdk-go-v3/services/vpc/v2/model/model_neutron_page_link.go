package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type NeutronPageLink struct {
	// API链接

	Href string `json:"href"`
	// API链接与该API版本的关系

	Rel string `json:"rel"`
}

func (o NeutronPageLink) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NeutronPageLink struct{}"
	}

	return strings.Join([]string{"NeutronPageLink", string(data)}, " ")
}
