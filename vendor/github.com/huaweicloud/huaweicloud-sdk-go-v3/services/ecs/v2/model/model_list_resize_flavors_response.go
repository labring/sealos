package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type ListResizeFlavorsResponse struct {
	// 云服务器规格列表。

	Flavors        *[]ListResizeFlavorsResult `json:"flavors,omitempty"`
	HttpStatusCode int                        `json:"-"`
}

func (o ListResizeFlavorsResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ListResizeFlavorsResponse struct{}"
	}

	return strings.Join([]string{"ListResizeFlavorsResponse", string(data)}, " ")
}
