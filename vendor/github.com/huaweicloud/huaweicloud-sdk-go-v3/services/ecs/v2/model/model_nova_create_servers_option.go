package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"errors"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/converter"

	"strings"
)

//  弹性云服务器信息
type NovaCreateServersOption struct {
	// 弹性云服务器自动释放时间。  时间格式例如：2020-01-19T03:30:52Z

	AutoTerminateTime *string `json:"auto_terminate_time,omitempty"`
	// 镜像ID或者镜像资源的URL。  - 镜像ID示例：3b8d6fef-af77-42ab-b8b7-5a7f0f0af8f2 - 镜像URL示例：http://glance.openstack.example.com/images/3b8d6fef-af77-42ab-b8b7-5a7f0f0af8f2 - 指定卷作为系统卷创弹性云服务器时，不需填写该参数；非卷创建弹性云服务器时需填写有效的UUID参数，否则API将返回400错误。  > 说明： > - 对于部分规格的弹性云服务器，不能支持公有云平台提供的所有公共镜像。具体规格的镜像支持列表，请登录管理控制台，以“创建弹性云服务器”页面系统自动过滤的镜像信息为准，并在镜像服务页面查询镜像ID。 > - 如果创建失败，请尝试修改参数配置。

	ImageRef *string `json:"imageRef,omitempty"`
	// 规格ID或URL。

	FlavorRef string `json:"flavorRef"`
	// 弹性云服务器名称，长度大于0小于256字节。  > 说明： >  > 云服务器内部主机名(hostname)命名规则遵循 [RFC 952](https://tools.ietf.org/html/rfc952)和[RFC 1123](https://tools.ietf.org/html/rfc1123)命名规范，建议使用a-zA-z或0-9以及中划线\"-\"组成的名称命名，\"_\"将在弹性云服务器内部默认转化为\"-\"。

	Name string `json:"name"`
	// 用户自定义字段键值对。  > - key的长度大于0小于256字节 > - value的长度大于等于0小于256字节   系统预留字段  1. admin_pass：弹性云服务器密码        Windows弹性云服务器Administrator用户的密码。     > 说明：     > 创建密码方式鉴权的Windows弹性云服务器时为必选字段。

	Metadata map[string]string `json:"metadata,omitempty"`
	// 如果需要使用密码方式登录云服务器，可使用adminPass字段指定云服务器管理员帐户初始登录密码。其中，Linux管理员帐户为root，Windows管理员帐户为Administrator。

	AdminPass *string `json:"adminPass,omitempty"`
	// 扩展属性，指定弹性云服务器存储设备的v2接口。是存储资源的新版本接口，指定卷场景不能批创弹性云服务器。  裸金属服务器场景不支持。

	BlockDeviceMappingV2 *[]NovaServerBlockDeviceMapping `json:"block_device_mapping_v2,omitempty"`
	// 扩展属性，开启后在弹性云服务器创建时挂载config_drive向弹性云服务器内部传递信息。  当前不支持该功能。

	ConfigDrive *string `json:"config_drive,omitempty"`
	// 扩展属性，指定弹性云服务器的安全组，默认为default。  指定network创建弹性云服务器时该字段有效。对于已存在端口，安全组请求无效。

	SecurityGroups *[]NovaServerSecurityGroup `json:"security_groups,omitempty"`
	// 扩展属性，指定弹性云服务器的网卡信息。有多个租户网络时必须指定。

	Networks []NovaServerNetwork `json:"networks"`
	// 扩展属性，指定keypair的名称。

	KeyName *string `json:"key_name,omitempty"`
	// 扩展属性，字符串长度小于65535，且必须是base64加密的。

	UserData *string `json:"user_data,omitempty"`
	// 扩展属性，指定弹性云服务器所在的AZ。  创建弹性云服务器时需要填入该参数。

	AvailabilityZone *string `json:"availability_zone,omitempty"`
	// 扩展属性，是否支持返回批量创建弹性云服务器的reservation_id。通过返回的reservation_id，可以过滤查询到本次创建的弹性云服务器。  - true，返回reservation_id。 - false，返回弹性云服务器信息。  > 说明： >  > 批量创建弹性云服务器时，支持使用该字段。

	ReturnReservationId *bool `json:"return_reservation_id,omitempty"`
	// 扩展属性，表示创建弹性云服务器最小数量。  默认值为1。  > 说明： >  > 指定镜像创建弹性云服务器时，支持使用该字段。

	MinCount *int32 `json:"min_count,omitempty"`
	// 表示创建弹性云服务器最大数量。  默认值与min_count的取值一致。  约束：  参数max_count的取值必须大于参数min_count的取值。  当min_count、max_count同时设置时，创弹性云服务器的数量取决于服务器的资源情况。根据资源情况，在min_count至max_count的取值范围内创建最大数量的弹性云服务器。  - 说明： -  - 指定镜像创建弹性云服务器时，支持使用该字段。

	MaxCount *int32 `json:"max_count,omitempty"`
	// diskConfig的方式，取值为AUTO、MANUAL。  - MANUAL，镜像空间不会扩展。 - AUTO，系统盘镜像空间会自动扩展为与flavor大小一致。  当前不支持该功能。

	OSDCFdiskConfig *NovaCreateServersOptionOSDCFdiskConfig `json:"OS-DCF:diskConfig,omitempty"`
	// 扩展属性，表示弹性云服务器描述信息，默认为空字符串。  - 长度最多允许85个字符。 - 不能包含“<” 和 “>”等特殊符号。  > 说明： >  > - V2接口不支持该字段。 > - V2.1接口支持该字段，此时，需在请求Header中增加一组Key-Value值。其中，Key固定为“X-OpenStack-Nova-API-Version” ，Value为微版本号，当Value的值为2.19时，支持使用该字段。

	Description *string `json:"description,omitempty"`
}

func (o NovaCreateServersOption) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "NovaCreateServersOption struct{}"
	}

	return strings.Join([]string{"NovaCreateServersOption", string(data)}, " ")
}

type NovaCreateServersOptionOSDCFdiskConfig struct {
	value string
}

type NovaCreateServersOptionOSDCFdiskConfigEnum struct {
	AUTO   NovaCreateServersOptionOSDCFdiskConfig
	MANUAL NovaCreateServersOptionOSDCFdiskConfig
}

func GetNovaCreateServersOptionOSDCFdiskConfigEnum() NovaCreateServersOptionOSDCFdiskConfigEnum {
	return NovaCreateServersOptionOSDCFdiskConfigEnum{
		AUTO: NovaCreateServersOptionOSDCFdiskConfig{
			value: "AUTO",
		},
		MANUAL: NovaCreateServersOptionOSDCFdiskConfig{
			value: "MANUAL",
		},
	}
}

func (c NovaCreateServersOptionOSDCFdiskConfig) MarshalJSON() ([]byte, error) {
	return utils.Marshal(c.value)
}

func (c *NovaCreateServersOptionOSDCFdiskConfig) UnmarshalJSON(b []byte) error {
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
