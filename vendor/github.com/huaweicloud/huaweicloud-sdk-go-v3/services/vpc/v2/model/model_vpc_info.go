package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type VpcInfo struct {
	// 对等连接其中一端vpc ID

	VpcId string `json:"vpc_id"`
	// 对等连接其中一端vpc所属的租户ID 约束：跨租户VPC创建对等连接时必选

	TenantId *string `json:"tenant_id,omitempty"`
}

func (o VpcInfo) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "VpcInfo struct{}"
	}

	return strings.Join([]string{"VpcInfo", string(data)}, " ")
}
