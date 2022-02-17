package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// 云服务器详情。
type ServerDetail struct {
	// 弹性云服务器状态。  取值范围：  ACTIVE、BUILD、DELETED、ERROR、HARD_REBOOT、MIGRATING、PAUSED、REBOOT、REBUILD、RESIZE、REVERT_RESIZE、SHUTOFF、SHELVED、SHELVED_OFFLOADED、SOFT_DELETED、SUSPENDED、VERIFY_RESIZE  弹性云服务器状态说明请参考[云服务器状态](https://support.huaweicloud.com/api-ecs/ecs_08_0002.html)

	Status string `json:"status"`
	// 弹性云服务器更新时间。  时间格式例如：2019-05-22T03:30:52Z

	Updated string `json:"updated"`
	// 弹性云服务器自动释放时间。  时间格式例如：2020-01-19T03:30:52Z

	AutoTerminateTime string `json:"auto_terminate_time"`
	// 弹性云服务器所在主机的主机ID。

	HostId string `json:"hostId"`
	// 弹性云服务器所在主机的主机名称。

	OSEXTSRVATTRhost string `json:"OS-EXT-SRV-ATTR:host"`
	// 弹性云服务器的网络属性。

	Addresses map[string][]ServerAddress `json:"addresses"`
	// 弹性云服务器使用的密钥对名称。

	KeyName string `json:"key_name"`

	Image *ServerImage `json:"image"`
	// 扩展属性，弹性云服务器当前任务的状态。  取值范围请参考[云服务器状态](https://support.huaweicloud.com/api-ecs/ecs_08_0002.html)表3。

	OSEXTSTStaskState string `json:"OS-EXT-STS:task_state"`
	// 扩展属性，弹性云服务器当前状态。  云服务器状态说明请参考[云服务器状态](https://support.huaweicloud.com/api-ecs/ecs_08_0002.html)。

	OSEXTSTSvmState string `json:"OS-EXT-STS:vm_state"`
	// 扩展属性，弹性云服务器别名。

	OSEXTSRVATTRinstanceName string `json:"OS-EXT-SRV-ATTR:instance_name"`
	// 扩展属性，弹性云服务器所在虚拟化主机名。

	OSEXTSRVATTRhypervisorHostname string `json:"OS-EXT-SRV-ATTR:hypervisor_hostname"`

	Flavor *ServerFlavor `json:"flavor"`
	// 弹性云服务器ID，格式为UUID。

	Id string `json:"id"`
	// 弹性云服务器所属安全组列表。

	SecurityGroups []ServerSecurityGroup `json:"security_groups"`
	// 扩展属性，弹性云服务器所在可用区名称。

	OSEXTAZavailabilityZone string `json:"OS-EXT-AZ:availability_zone"`
	// 创建弹性云服务器的用户ID，格式为UUID。

	UserId string `json:"user_id"`
	// 弹性云服务器名称。

	Name string `json:"name"`
	// 弹性云服务器创建时间。  时间格式例如：2019-05-22T03:19:19Z

	Created string `json:"created"`
	// 弹性云服务器所属租户ID，即项目id，和project_id表示相同的概念，格式为UUID。

	TenantId string `json:"tenant_id"`
	// 扩展属性， diskConfig的类型。  - MANUAL，镜像空间不会扩展。 - AUTO，系统盘镜像空间会自动扩展为与flavor大小一致。

	OSDCFdiskConfig *string `json:"OS-DCF:diskConfig,omitempty"`
	// 预留属性。

	AccessIPv4 string `json:"accessIPv4"`
	// 预留属性。

	AccessIPv6 string `json:"accessIPv6"`

	Fault *ServerFault `json:"fault,omitempty"`
	// 弹性云服务器进度。

	Progress *int32 `json:"progress,omitempty"`
	// 扩展属性，弹性云服务器电源状态。

	OSEXTSTSpowerState int32 `json:"OS-EXT-STS:power_state"`
	// config drive信息。

	ConfigDrive string `json:"config_drive"`
	// 弹性云服务器元数据。  > 说明： >  > 元数据包含系统默认添加字段和用户设置的字段。  系统默认添加字段  1. charging_mode 云服务器的计费类型。  - “0”：按需计费（即postPaid-后付费方式）。 - “1”：按包年包月计费（即prePaid-预付费方式）。\"2\"：竞价实例计费  2. metering.order_id 按“包年/包月”计费的云服务器对应的订单ID。  3. metering.product_id 按“包年/包月”计费的云服务器对应的产品ID。  4. vpc_id 云服务器所属的虚拟私有云ID。  5. EcmResStatus 云服务器的冻结状态。  - normal：云服务器正常状态（未被冻结）。 - freeze：云服务器被冻结。  > 当云服务器被冻结或者解冻后，系统默认添加该字段，且该字段必选。  6. metering.image_id 云服务器操作系统对应的镜像ID  7.  metering.imagetype 镜像类型，目前支持：  - 公共镜像（gold） - 私有镜像（private） - 共享镜像（shared）  8. metering.resourcespeccode 云服务器对应的资源规格。  9. image_name 云服务器操作系统对应的镜像名称。  10. os_bit 操作系统位数，一般取值为“32”或者“64”。  11. lockCheckEndpoint 回调URL，用于检查弹性云服务器的加锁是否有效。  - 如果有效，则云服务器保持锁定状态。 - 如果无效，解除锁定状态，删除失效的锁。  12. lockSource 弹性云服务器来自哪个服务。订单加锁（ORDER）  13. lockSourceId 弹性云服务器的加锁来自哪个ID。lockSource为“ORDER”时，lockSourceId为订单ID。  14. lockScene 弹性云服务器的加锁类型。  - 按需转包周期（TO_PERIOD_LOCK）  15. virtual_env_type  - IOS镜像创建虚拟机，\"virtual_env_type\": \"IsoImage\" 属性； - 非IOS镜像创建虚拟机，在19.5.0版本以后创建的虚拟机将不会添加virtual_env_type 属性，而在此之前的版本创建的虚拟机可能会返回\"virtual_env_type\": \"FusionCompute\"属性 。  > virtual_env_type属性不允许用户增加、删除和修改。  16. metering.resourcetype 云服务器对应的资源类型。  17. os_type 操作系统类型，取值为：Linux、Windows。  18. cascaded.instance_extrainfo 系统内部虚拟机扩展信息。  19. __support_agent_list 云服务器是否支持企业主机安全、主机监控。  - “hss”：企业主机安全 -  “ces”：主机监控  20. agency_name 委托的名称。  委托是由租户管理员在统一身份认证服务（Identity and Access Management，IAM）上创建的，可以为弹性云服务器提供访问云服务的临时凭证。

	Metadata map[string]string `json:"metadata"`
	// 弹性云服务器启动时间。时间格式例如：2019-05-22T03:23:59.000000

	OSSRVUSGlaunchedAt string `json:"OS-SRV-USG:launched_at"`
	// 弹性云服务器删除时间。  时间格式例如：2019-05-22T03:23:59.000000

	OSSRVUSGterminatedAt string `json:"OS-SRV-USG:terminated_at"`
	// 挂载到弹性云服务器上的磁盘。

	OsExtendedVolumesvolumesAttached []ServerExtendVolumeAttachment `json:"os-extended-volumes:volumes_attached"`
	// 弹性云服务器的描述信息。

	Description *string `json:"description,omitempty"`
	// nova-compute状态。  - UP：服务正常 - UNKNOWN：状态未知 - DOWN：服务异常 - MAINTENANCE：维护状态 - 空字符串：弹性云服务器无主机信息

	HostStatus string `json:"host_status"`
	// 弹性云服务器的主机名。

	OSEXTSRVATTRhostname string `json:"OS-EXT-SRV-ATTR:hostname"`
	// 批量创建场景，弹性云服务器的预留ID。

	OSEXTSRVATTRreservationId *string `json:"OS-EXT-SRV-ATTR:reservation_id,omitempty"`
	// 批量创建场景，弹性云服务器的启动顺序。

	OSEXTSRVATTRlaunchIndex int32 `json:"OS-EXT-SRV-ATTR:launch_index"`
	// 若使用AMI格式的镜像，则表示kernel image的UUID；否则，留空。

	OSEXTSRVATTRkernelId string `json:"OS-EXT-SRV-ATTR:kernel_id"`
	// 若使用AMI格式镜像，则表示ramdisk image的UUID；否则，留空。

	OSEXTSRVATTRramdiskId string `json:"OS-EXT-SRV-ATTR:ramdisk_id"`
	// 弹性云服务器系统盘的设备名称。

	OSEXTSRVATTRrootDeviceName string `json:"OS-EXT-SRV-ATTR:root_device_name"`
	// 创建弹性云服务器时指定的user_data。

	OSEXTSRVATTRuserData *string `json:"OS-EXT-SRV-ATTR:user_data,omitempty"`
	// 弹性云服务器是否为锁定状态。  - true：锁定 - false：未锁定

	Locked bool `json:"locked"`
	// 弹性云服务器标签。

	Tags *[]string `json:"tags,omitempty"`

	OsschedulerHints *ServerSchedulerHints `json:"os:scheduler_hints,omitempty"`
	// 弹性云服务器所属的企业项目ID。

	EnterpriseProjectId *string `json:"enterprise_project_id,omitempty"`
	// 弹性云服务器系统标签。

	SysTags *[]ServerSystemTag `json:"sys_tags,omitempty"`

	CpuOptions *CpuOptions `json:"cpu_options,omitempty"`

	Hypervisor *Hypervisor `json:"hypervisor,omitempty"`
}

func (o ServerDetail) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ServerDetail struct{}"
	}

	return strings.Join([]string{"ServerDetail", string(data)}, " ")
}
