package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// 云服务器详情。
type UpdateServerResult struct {
	// 项目ID。

	TenantId string `json:"tenant_id"`
	// 镜像ID。

	Image string `json:"image"`
	// 预留属性。

	AccessIPv4 string `json:"accessIPv4"`
	// 预留属性。

	AccessIPv6 string `json:"accessIPv6"`
	// 云服务器元数据。

	Metadata map[string]string `json:"metadata"`
	// 弹性云服务器的网络属性。

	Addresses map[string][]UpdateServerAddress `json:"addresses"`
	// 弹性云服务器创建时间。  时间格式例如：2019-05-22T03:19:19Z

	Created string `json:"created"`
	// 弹性云服务器所在主机的主机ID。

	HostId string `json:"hostId"`

	Flavor *SimpleFlavor `json:"flavor"`
	// 扩展属性， diskConfig的类型。  - MANUAL，镜像空间不会扩展。 - AUTO，系统盘镜像空间会自动扩展为与flavor大小一致。

	OSDCFdiskConfig *string `json:"OS-DCF:diskConfig,omitempty"`
	// 创建弹性云服务器的用户ID，格式为UUID。

	UserId string `json:"user_id"`
	// 弹性云服务器名称。

	Name string `json:"name"`
	// 弹性云服务器进度。

	Progress int32 `json:"progress"`
	// 云服务器相关标记快捷链接信息。

	Links []Link `json:"links"`
	// 弹性云服务器ID，格式为UUID。

	Id string `json:"id"`
	// 弹性云服务器更新时间。  时间格式例如：2019-05-22T03:30:52Z

	Updated string `json:"updated"`
	// 弹性云服务器是否为锁定状态。  - true：锁定 - false：未锁定

	Locked *bool `json:"locked,omitempty"`
	// 弹性云服务器的描述信息。

	Description *string `json:"description,omitempty"`
	// 云服务器的标签列表。  微版本2.26后支持，如果不使用微版本查询，响应中无tags字段。  系统近期对标签功能进行了升级，升级后，返回的tag值遵循如下规则：  - key与value使用“=”连接，如“key=value”。 - 如果value为空字符串，则仅返回key。 - key与value使用“=”连接，如“key=value”。 - 如果value为空字符串，则仅返回key。

	Tags []string `json:"tags"`
	// 弹性云服务器状态。  取值范围：  ACTIVE、BUILD、DELETED、ERROR、HARD_REBOOT、MIGRATING、PAUSED、REBOOT、REBUILD、RESIZE、REVERT_RESIZE、SHUTOFF、SHELVED、SHELVED_OFFLOADED、SOFT_DELETED、SUSPENDED、VERIFY_RESIZE  弹性云服务器状态说明请参考[云服务器状态](https://support.huaweicloud.com/api-ecs/ecs_08_0002.html)

	Status string `json:"status"`
	// 弹性云服务器的主机名。

	OSEXTSRVATTRhostname string `json:"OS-EXT-SRV-ATTR:hostname"`
}

func (o UpdateServerResult) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "UpdateServerResult struct{}"
	}

	return strings.Join([]string{"UpdateServerResult", string(data)}, " ")
}
