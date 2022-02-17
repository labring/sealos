package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type ResizeServerResponse struct {
	// 订单号，创建包年包月的弹性云服务器时返回该参数。

	OrderId *string `json:"order_id,omitempty"`
	// 任务ID，变更按需的弹性云服务器规格时返回该参数。

	JobId          *string `json:"job_id,omitempty"`
	HttpStatusCode int     `json:"-"`
}

func (o ResizeServerResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ResizeServerResponse struct{}"
	}

	return strings.Join([]string{"ResizeServerResponse", string(data)}, " ")
}
