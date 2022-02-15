package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

//
type ListServerGroupsResult struct {
	// 云服务器组UUID。

	Id string `json:"id"`
	// 云服务器组中包含的云服务器列表。

	Members []string `json:"members"`
	// 云服务器组元数据。

	Metadata map[string]string `json:"metadata"`
	// 云服务器组名称。

	Name string `json:"name"`
	// 与服务器组关联的策略名称列表。当前有效的策略名称为:  anti-affinity -此组中的服务器必须安排到不同的主机；  affinity -此组中的服务器必须安排在同一主机上;  soft-anti-affinity –如果可能, 应将此组中的服务器安排到不同的主机, 但如果无法实现, 则仍应安排它们, 而不是导致生成失败;  soft-affinity -如果可能, 应将此组中的服务器安排在同一主机上, 但如果无法实现, 则仍应安排它们, 而不是导致生成失败。

	Policies []string `json:"policies"`
}

func (o ListServerGroupsResult) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ListServerGroupsResult struct{}"
	}

	return strings.Join([]string{"ListServerGroupsResult", string(data)}, " ")
}
