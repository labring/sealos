package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

//
type NovaServer struct {
	// 云服务器名称。

	Name string `json:"name"`
	// 云服务器唯一标识。

	Id string `json:"id"`
	// 云服务器当前状态信息。  取值范围： ACTIVE， BUILD，DELETED，ERROR，HARD_REBOOT，MIGRATING，REBOOT，RESIZE，REVERT_RESIZE，SHELVED，SHELVED_OFFLOADED，SHUTOFF，UNKNOWN，VERIFY_RESIZE  云服务器状态说明请参考[云服务器状态](https://support.huaweicloud.com/api-ecs/ecs_08_0002.html)。

	Status NovaServerStatus `json:"status"`
	// 云服务器创建时间。 时间格式例如：2019-05-22T07:48:53Z

	Created string `json:"created"`
	// 云服务器上一次更新时间。时间格式例如：2019-05-22T07:48:53Z

	Updated string `json:"updated"`

	Flavor *NovaServerFlavor `json:"flavor"`

	Image *NovaServerImage `json:"image"`
	// 云服务器所属租户ID。即项目id，与project_id表示相同的概念。

	TenantId string `json:"tenant_id"`
	// SSH密钥名称。

	KeyName string `json:"key_name"`
	// 云服务器所属用户ID。

	UserId string `json:"user_id"`
	// 云服务器元数据。

	Metadata map[string]string `json:"metadata"`
	// 云服务器对应的主机ID。

	HostId string `json:"hostId"`
	// 云服务器对应的网络地址信息。

	Addresses map[string][]NovaNetwork `json:"addresses"`
	// 云服务器所属安全组列表。

	SecurityGroups []NovaServerSecurityGroup `json:"security_groups"`
	// 云服务器相关标记快捷链接信息。

	Links []NovaLink `json:"links"`
	// 扩展属性，磁盘配置方式。对镜像启动云服务器生效。  取值范围：  - AUTO: API使用单个分区构建目标磁盘大小的云服务器。 API会自动调整文件系统以适应整个分区。 - MANUAL：API使用源映像中的分区方案和文件系统构建服务器。如果目标磁盘较大，则API不分区剩余的磁盘空间。

	OSDCFdiskConfig NovaServerOSDCFdiskConfig `json:"OS-DCF:diskConfig"`
	// 扩展属性，可用分区编码。

	OSEXTAZavailabilityZone string `json:"OS-EXT-AZ:availability_zone"`
	// 扩展属性，与主机宿主名称。

	OSEXTSRVATTRhost string `json:"OS-EXT-SRV-ATTR:host"`
	// 扩展属性，hypervisor主机名。

	OSEXTSRVATTRhypervisorHostname string `json:"OS-EXT-SRV-ATTR:hypervisor_hostname"`
	// 扩展属性，云服务器实例ID。

	OSEXTSRVATTRinstanceName string `json:"OS-EXT-SRV-ATTR:instance_name"`
	// 扩展属性，云服务器电源状态。  取值范围：0，1，2，3，4  - 0 : pending - 1 : running - 2 : paused - 3 : shutdown - 4 : crashed

	OSEXTSTSpowerState int32 `json:"OS-EXT-STS:power_state"`
	// 扩展属性，云服务器任务状态。  取值范围：  SHOUTOFF, RESIZE, REBUILD, VERIFY_RESIZE, REVERT_RESIZE, PAUSED, MIGRATING, SUSPENDED, RESCUE, ERROR, DELETED,SOFT_DELETED,SHELVED,SHELVED_OFFLOADED  取值范围请参考[云服务器状态](https://support.huaweicloud.com/api-ecs/ecs_08_0002.html)表3。

	OSEXTSTStaskState NovaServerOSEXTSTStaskState `json:"OS-EXT-STS:task_state"`
	// 扩展属性，云服务器状态。  取值范围：  ACTIVE,BUILDING,STOPPED,RESIZED,PAUSED,SUSPENDED,RESCUED,ERROR,DELETED,SOFT_DELETED,SHELVED,SHELVED_OFFLOADED  云服务器状态说明请参考[云服务器状态](https://support.huaweicloud.com/api-ecs/ecs_08_0002.html)。

	OSEXTSTSvmState NovaServerOSEXTSTSvmState `json:"OS-EXT-STS:vm_state"`
	// 扩展属性，云服务器启动时间。时间格式例如：2019-05-22T07:48:19.000000

	OSSRVUSGlaunchedAt string `json:"OS-SRV-USG:launched_at"`
	// 扩展属性，云服务器关闭时间。  时间格式例如：2019-05-22T07:48:19.000000

	OSSRVUSGterminatedAt string `json:"OS-SRV-USG:terminated_at"`
	// 云服务器挂载的云磁盘信息。

	OsExtendedVolumesvolumesAttached []NovaServerVolume `json:"os-extended-volumes:volumes_attached"`

	Fault *NovaServerFault `json:"fault,omitempty"`
	// 弹性云服务器的描述信息。  微版本2.19后支持

	Description *string `json:"description,omitempty"`
	// nova-compute状态。  - UP：服务正常 - UNKNOWN：状态未知 - DOWN：服务异常 - MAINTENANCE：维护状态 - 空字符串：弹性云服务器无主机信息

	HostStatus NovaServerHostStatus `json:"host_status"`
	// 弹性云服务器的主机名。  微版本2.3后支持

	OSEXTSRVATTRhostname *string `json:"OS-EXT-SRV-ATTR:hostname,omitempty"`
	// 批量创建场景，弹性云服务器的预留ID。  微版本2.3后支持

	OSEXTSRVATTRreservationId *string `json:"OS-EXT-SRV-ATTR:reservation_id,omitempty"`
	// 批量创建场景，弹性云服务器的启动顺序。  微版本2.3后支持

	OSEXTSRVATTRlaunchIndex *int32 `json:"OS-EXT-SRV-ATTR:launch_index,omitempty"`
	// 若使用AMI格式的镜像，则表示kernel image的UUID；否则，留空。  微版本2.3后支持

	OSEXTSRVATTRkernelId *string `json:"OS-EXT-SRV-ATTR:kernel_id,omitempty"`
	// 若使用AMI格式镜像，则表示ramdisk image的UUID；否则，留空。  微版本2.3后支持

	OSEXTSRVATTRramdiskId *string `json:"OS-EXT-SRV-ATTR:ramdisk_id,omitempty"`
	// 弹性云服务器系统盘的设备名称。  微版本2.3后支持

	OSEXTSRVATTRrootDeviceName *string `json:"OS-EXT-SRV-ATTR:root_device_name,omitempty"`
	// 创建弹性云服务器时指定的user_data。  微版本2.3后支持

	OSEXTSRVATTRuserData *string `json:"OS-EXT-SRV-ATTR:user_data,omitempty"`
	// 云服务器的标签列表。  系统近期对标签功能进行了升级，升级后，返回的tag值遵循如下规则：  - key与value使用“=”连接，如“key=value”。 - 如果value为空字符串，则仅返回key。

	Tags []string `json:"tags"`
	// 当云服务器被锁时为True，否则为False。  微版本2.9后支持

	Locked *bool `json:"locked,omitempty"`
	// 预留属性。

	AccessIPv4 string `json:"accessIPv4"`
	// 预留属性。

	AccessIPv6 string `json:"accessIPv6"`
	// 预留属性。

	ConfigDrive string `json:"config_drive"`
	// 预留属性

	Progress int32 `json:"progress"`

	OsschedulerHints *NovaServerSchedulerHints `json:"os:scheduler_hints,omitempty"`
}

func (o NovaServer) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NovaServer struct{}"
	}

	return strings.Join([]string{"NovaServer", string(data)}, " ")
}

type NovaServerStatus struct {
	value string
}

type NovaServerStatusEnum struct {
	ACTIVE            NovaServerStatus
	BUILD             NovaServerStatus
	DELETED           NovaServerStatus
	ERROR             NovaServerStatus
	HARD_REBOOT       NovaServerStatus
	MIGRATING         NovaServerStatus
	REBOOT            NovaServerStatus
	RESIZE            NovaServerStatus
	REVERT_RESIZE     NovaServerStatus
	SHELVED           NovaServerStatus
	SHELVED_OFFLOADED NovaServerStatus
	SHUTOFF           NovaServerStatus
	UNKNOWN           NovaServerStatus
	VERIFY_RESIZE     NovaServerStatus
}

func GetNovaServerStatusEnum() NovaServerStatusEnum {
	return NovaServerStatusEnum{
		ACTIVE: NovaServerStatus{
			value: "ACTIVE",
		},
		BUILD: NovaServerStatus{
			value: " BUILD",
		},
		DELETED: NovaServerStatus{
			value: "DELETED",
		},
		ERROR: NovaServerStatus{
			value: "ERROR",
		},
		HARD_REBOOT: NovaServerStatus{
			value: "HARD_REBOOT",
		},
		MIGRATING: NovaServerStatus{
			value: "MIGRATING",
		},
		REBOOT: NovaServerStatus{
			value: "REBOOT",
		},
		RESIZE: NovaServerStatus{
			value: "RESIZE",
		},
		REVERT_RESIZE: NovaServerStatus{
			value: "REVERT_RESIZE",
		},
		SHELVED: NovaServerStatus{
			value: "SHELVED",
		},
		SHELVED_OFFLOADED: NovaServerStatus{
			value: "SHELVED_OFFLOADED",
		},
		SHUTOFF: NovaServerStatus{
			value: "SHUTOFF",
		},
		UNKNOWN: NovaServerStatus{
			value: "UNKNOWN",
		},
		VERIFY_RESIZE: NovaServerStatus{
			value: "VERIFY_RESIZE",
		},
	}
}

func (c NovaServerStatus) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *NovaServerStatus) UnmarshalJSON(b []byte) error {
	myConverter := converter.StringConverterFactory("string")
	if myConverter != nil {
		val, err := myConverter.CovertStringToInterface(strings.Trim(string(b[:]), "\""))
		if err == nil {
			c.value = val.(string)
			return nil
		}
		return err
	} else {
		return errors.New("convert enum data to string error")
	}
}

type NovaServerOSDCFdiskConfig struct {
	value string
}

type NovaServerOSDCFdiskConfigEnum struct {
	AUTO   NovaServerOSDCFdiskConfig
	MANUAL NovaServerOSDCFdiskConfig
}

func GetNovaServerOSDCFdiskConfigEnum() NovaServerOSDCFdiskConfigEnum {
	return NovaServerOSDCFdiskConfigEnum{
		AUTO: NovaServerOSDCFdiskConfig{
			value: "AUTO",
		},
		MANUAL: NovaServerOSDCFdiskConfig{
			value: "MANUAL",
		},
	}
}

func (c NovaServerOSDCFdiskConfig) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *NovaServerOSDCFdiskConfig) UnmarshalJSON(b []byte) error {
	myConverter := converter.StringConverterFactory("string")
	if myConverter != nil {
		val, err := myConverter.CovertStringToInterface(strings.Trim(string(b[:]), "\""))
		if err == nil {
			c.value = val.(string)
			return nil
		}
		return err
	} else {
		return errors.New("convert enum data to string error")
	}
}

type NovaServerOSEXTSTStaskState struct {
	value string
}

type NovaServerOSEXTSTStaskStateEnum struct {
	SHOUTOFF          NovaServerOSEXTSTStaskState
	RESIZE            NovaServerOSEXTSTStaskState
	REBUILD           NovaServerOSEXTSTStaskState
	VERIFY_RESIZE     NovaServerOSEXTSTStaskState
	REVERT_RESIZE     NovaServerOSEXTSTStaskState
	PAUSED            NovaServerOSEXTSTStaskState
	MIGRATING         NovaServerOSEXTSTStaskState
	SUSPENDED         NovaServerOSEXTSTStaskState
	RESCUE            NovaServerOSEXTSTStaskState
	ERROR             NovaServerOSEXTSTStaskState
	DELETED           NovaServerOSEXTSTStaskState
	SOFT_DELETED      NovaServerOSEXTSTStaskState
	SHELVED           NovaServerOSEXTSTStaskState
	SHELVED_OFFLOADED NovaServerOSEXTSTStaskState
}

func GetNovaServerOSEXTSTStaskStateEnum() NovaServerOSEXTSTStaskStateEnum {
	return NovaServerOSEXTSTStaskStateEnum{
		SHOUTOFF: NovaServerOSEXTSTStaskState{
			value: "SHOUTOFF",
		},
		RESIZE: NovaServerOSEXTSTStaskState{
			value: " RESIZE",
		},
		REBUILD: NovaServerOSEXTSTStaskState{
			value: " REBUILD",
		},
		VERIFY_RESIZE: NovaServerOSEXTSTStaskState{
			value: " VERIFY_RESIZE",
		},
		REVERT_RESIZE: NovaServerOSEXTSTStaskState{
			value: " REVERT_RESIZE",
		},
		PAUSED: NovaServerOSEXTSTStaskState{
			value: " PAUSED",
		},
		MIGRATING: NovaServerOSEXTSTStaskState{
			value: " MIGRATING",
		},
		SUSPENDED: NovaServerOSEXTSTStaskState{
			value: " SUSPENDED",
		},
		RESCUE: NovaServerOSEXTSTStaskState{
			value: " RESCUE",
		},
		ERROR: NovaServerOSEXTSTStaskState{
			value: " ERROR",
		},
		DELETED: NovaServerOSEXTSTStaskState{
			value: " DELETED",
		},
		SOFT_DELETED: NovaServerOSEXTSTStaskState{
			value: "SOFT_DELETED",
		},
		SHELVED: NovaServerOSEXTSTStaskState{
			value: "SHELVED",
		},
		SHELVED_OFFLOADED: NovaServerOSEXTSTStaskState{
			value: "SHELVED_OFFLOADED",
		},
	}
}

func (c NovaServerOSEXTSTStaskState) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *NovaServerOSEXTSTStaskState) UnmarshalJSON(b []byte) error {
	myConverter := converter.StringConverterFactory("string")
	if myConverter != nil {
		val, err := myConverter.CovertStringToInterface(strings.Trim(string(b[:]), "\""))
		if err == nil {
			c.value = val.(string)
			return nil
		}
		return err
	} else {
		return errors.New("convert enum data to string error")
	}
}

type NovaServerOSEXTSTSvmState struct {
	value string
}

type NovaServerOSEXTSTSvmStateEnum struct {
	ACTIVE            NovaServerOSEXTSTSvmState
	BUILDING          NovaServerOSEXTSTSvmState
	STOPPED           NovaServerOSEXTSTSvmState
	RESIZED           NovaServerOSEXTSTSvmState
	PAUSED            NovaServerOSEXTSTSvmState
	SUSPENDED         NovaServerOSEXTSTSvmState
	RESCUED           NovaServerOSEXTSTSvmState
	ERROR             NovaServerOSEXTSTSvmState
	DELETED           NovaServerOSEXTSTSvmState
	SOFT_DELETED      NovaServerOSEXTSTSvmState
	SHELVED           NovaServerOSEXTSTSvmState
	SHELVED_OFFLOADED NovaServerOSEXTSTSvmState
}

func GetNovaServerOSEXTSTSvmStateEnum() NovaServerOSEXTSTSvmStateEnum {
	return NovaServerOSEXTSTSvmStateEnum{
		ACTIVE: NovaServerOSEXTSTSvmState{
			value: "ACTIVE",
		},
		BUILDING: NovaServerOSEXTSTSvmState{
			value: "BUILDING",
		},
		STOPPED: NovaServerOSEXTSTSvmState{
			value: "STOPPED",
		},
		RESIZED: NovaServerOSEXTSTSvmState{
			value: "RESIZED",
		},
		PAUSED: NovaServerOSEXTSTSvmState{
			value: "PAUSED",
		},
		SUSPENDED: NovaServerOSEXTSTSvmState{
			value: "SUSPENDED",
		},
		RESCUED: NovaServerOSEXTSTSvmState{
			value: "RESCUED",
		},
		ERROR: NovaServerOSEXTSTSvmState{
			value: "ERROR",
		},
		DELETED: NovaServerOSEXTSTSvmState{
			value: "DELETED",
		},
		SOFT_DELETED: NovaServerOSEXTSTSvmState{
			value: "SOFT_DELETED",
		},
		SHELVED: NovaServerOSEXTSTSvmState{
			value: "SHELVED",
		},
		SHELVED_OFFLOADED: NovaServerOSEXTSTSvmState{
			value: "SHELVED_OFFLOADED",
		},
	}
}

func (c NovaServerOSEXTSTSvmState) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *NovaServerOSEXTSTSvmState) UnmarshalJSON(b []byte) error {
	myConverter := converter.StringConverterFactory("string")
	if myConverter != nil {
		val, err := myConverter.CovertStringToInterface(strings.Trim(string(b[:]), "\""))
		if err == nil {
			c.value = val.(string)
			return nil
		}
		return err
	} else {
		return errors.New("convert enum data to string error")
	}
}

type NovaServerHostStatus struct {
	value string
}

type NovaServerHostStatusEnum struct {
	UP          NovaServerHostStatus
	UNKNOWN     NovaServerHostStatus
	DOWN        NovaServerHostStatus
	MAINTENANCE NovaServerHostStatus
}

func GetNovaServerHostStatusEnum() NovaServerHostStatusEnum {
	return NovaServerHostStatusEnum{
		UP: NovaServerHostStatus{
			value: "UP",
		},
		UNKNOWN: NovaServerHostStatus{
			value: "UNKNOWN",
		},
		DOWN: NovaServerHostStatus{
			value: "DOWN",
		},
		MAINTENANCE: NovaServerHostStatus{
			value: "MAINTENANCE",
		},
	}
}

func (c NovaServerHostStatus) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *NovaServerHostStatus) UnmarshalJSON(b []byte) error {
	myConverter := converter.StringConverterFactory("string")
	if myConverter != nil {
		val, err := myConverter.CovertStringToInterface(strings.Trim(string(b[:]), "\""))
		if err == nil {
			c.value = val.(string)
			return nil
		}
		return err
	} else {
		return errors.New("convert enum data to string error")
	}
}
