package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// Response Object
type ReinstallServerWithoutCloudInitResponse struct {
	// 提交任务成功后返回的任务ID，用户可以使用该ID对任务执行情况进行查询。

	JobId          *string `json:"job_id,omitempty"`
	HttpStatusCode int     `json:"-"`
}

func (o ReinstallServerWithoutCloudInitResponse) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ReinstallServerWithoutCloudInitResponse struct{}"
	}

	return strings.Join([]string{"ReinstallServerWithoutCloudInitResponse", string(data)}, " ")
}
