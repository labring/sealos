package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type ListServersDetailsResponse struct {
	// 弹性云服务器的列表总数。

	Count *int32 `json:"count,omitempty"`
	// 弹性云服务器详情列表，具体参照-查询云服务器详情接口。查询级别不同，返回的详情不同。

	Servers        *[]ServerDetail `json:"servers,omitempty"`
	HttpStatusCode int             `json:"-"`
}

func (o ListServersDetailsResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ListServersDetailsResponse struct{}"
	}

	return strings.Join([]string{"ListServersDetailsResponse", string(data)}, " ")
}
