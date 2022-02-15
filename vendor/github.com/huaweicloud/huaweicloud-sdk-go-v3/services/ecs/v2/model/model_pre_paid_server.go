package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// 创建弹性云服务器（包周期）接口Body体。
type PrePaidServer struct {
	// 弹性云服务器自动释放时间。  时间格式例如：2020-01-19T03:30:52Z

	AutoTerminateTime *string `json:"auto_terminate_time,omitempty"`
	// 待创建云服务器的系统镜像，需要指定已创建镜像的ID，ID格式为通用唯一识别码（Universally Unique Identifier，简称UUID）。  镜像的ID可以从镜像服务的 [查询镜像列表](https://apiexplorer.developer.huaweicloud.com/apiexplorer/doc?product=IMS&api=ListImages) 接口获取，该接口可根据 __imagetype、__os_type 等参数过滤选择合适镜像。

	ImageRef string `json:"imageRef"`
	// 待创建云服务器的系统规格的ID。  可通过 [规格列表接口](https://apiexplorer.developer.huaweicloud.com/apiexplorer/doc?product=ECS&api=ListFlavors) 查询，该接口支持通过 availability_zone 参数过滤出待创建云服务器可用区下可用的规格。  已上线的规格请参见《[弹性云服务器产品介绍](https://support.huaweicloud.com/ecs/index.html)》的“实例类型与规格”章节。

	FlavorRef string `json:"flavorRef"`
	// 云服务器名称。  取值范围：  - 只能由中文字符、英文字母、数字及“_”、“-”、“.”组成，且长度为[1-64]个字符。 - 创建的云服务器器数量（count字段对应的值）大于1时，为区分不同云服务器，创建过程中系统会自动在名称后加“-0000”的类似标记。故此时名称的长度为[1-59]个字符。  > 说明： >  > 云服务器虚拟机内部(hostname)命名规则遵循 RFC 952和RFC 1123命名规范，建议使用a-zA-z或0-9以及中划线\"-\"组成的名称命名，\"_\"将在弹性云服务器内部默认转化为\"-\"。

	Name string `json:"name"`
	// 创建云服务器过程中待注入用户数据。支持注入文本、文本文件或gzip文件。  更多关于待注入用户数据的信息，请参见《弹性云服务器用户指南 》的“[用户数据注入](https://support.huaweicloud.com/usermanual-ecs/zh-cn_topic_0032380449.html)”章节。  约束：  - 注入内容，需要进行base64格式编码。注入内容（编码之前的内容）最大长度32KB。 - 创建密码方式鉴权的Linux弹性云服务器时，该字段可为root用户注入自定义初始化密码，具体注入密码的使用方法请参见背景信息（设置登录鉴权方式）。 示例（base64编码前）：  - Linux弹性云服务器  ``` #! /bin/bash echo user_test >> /home/user.txt ```  - Windows弹性云服务器  ``` rem cmd echo 111 > c:\\\\aaa.tx ```

	UserData *string `json:"user_data,omitempty"`
	// 如果需要使用密码方式登录云服务器，可使用adminPass字段指定云服务器管理员帐户初始登录密码。其中，Linux管理员帐户为root，Windows管理员帐户为Administrator。具体使用方法请参见背景信息（设置登录鉴权方式）。  密码复杂度要求：   - 长度为8-26位。  - 密码至少必须包含大写字母、小写字母、数字和特殊字符（!@$%^-_=+[{}]:,./?）中的三种。 - 密码不能包含用户名或用户名的逆序。  - Windows系统密码不能包含用户名或用户名的逆序，不能包含用户名中超过两个连续字符的部分。

	AdminPass *string `json:"adminPass,omitempty"`
	// 如果需要使用SSH密钥方式登录云服务器，请指定已创建密钥的名称。  密钥可以通过密钥创建接口进行创建（请参见[创建和导入SSH密钥](https://support.huaweicloud.com/api-ecs/zh-cn_topic_0020212678.html)），或使用SSH密钥查询接口查询已有的密钥（请参见[查询SSH密钥列表](https://support.huaweicloud.com/api-ecs/ecs_03_1201.html) ）。

	KeyName *string `json:"key_name,omitempty"`
	// 待创建云服务器所属虚拟私有云（简称VPC），需要指定已创建VPC的ID，UUID格式。  可通过 [查询VPC列表](https://apiexplorer.developer.huaweicloud.com/apiexplorer/doc?product=VPC&api=ListVpcs) 接口查询。

	Vpcid string `json:"vpcid"`
	// 待创建云服务器的网卡信息。  约束：  - 网卡对应的子网（subnet）必须属于vpcid对应的VPC。 - 当前单个云服务器支持最多挂载12张网卡。 - 不同的规格对网卡上限有一定的区别，参考[规格清单](https://support.huaweicloud.com/productdesc-ecs/zh-cn_topic_0159822360.html)。

	Nics []PrePaidServerNic `json:"nics"`

	Publicip *PrePaidServerPublicip `json:"publicip,omitempty"`
	// 创建云服务器数量。  约束：  - 不传该字段时默认取值为1。 - 租户的配额足够时，最大值为500。

	Count *int32 `json:"count,omitempty"`
	// 当批量创建弹性云服务器时，云服务器名称是否允许重名，当count大于1的时候该参数生效。默认为True。  - True，表示允许重名。 - False，表示不允许重名。

	IsAutoRename *bool `json:"isAutoRename,omitempty"`

	RootVolume *PrePaidServerRootVolume `json:"root_volume"`
	// 云服务器对应数据盘相关配置。每一个数据结构代表一块待创建的数据盘。   约束：目前新创建的弹性云服务器最多可挂载23块数据盘。

	DataVolumes *[]PrePaidServerDataVolume `json:"data_volumes,omitempty"`
	// 云服务器对应安全组信息。  约束：当该值指定为空时，默认给云服务器绑定default安全组。

	SecurityGroups *[]PrePaidServerSecurityGroup `json:"security_groups,omitempty"`
	// 待创建云服务器所在的可用分区，需要指定可用分区（AZ）的名称。  可通过接口 [查询可用区列表接口](https://apiexplorer.developer.huaweicloud.com/apiexplorer/doc?product=ECS&api=NovaListAvailabilityZones) 获取，也可参考[地区和终端节点](https://developer.huaweicloud.com/endpoint)获取。

	AvailabilityZone *string `json:"availability_zone,omitempty"`

	Extendparam *PrePaidServerExtendParam `json:"extendparam,omitempty"`
	// 用户自定义字段键值对。  > 说明： >  > - 最多可注入10对键值（Key/Value）。 > - 主键（Key）只能由大写字母（A-Z）、小写字母（a-z）、数字（0-9）、中划线（-）、下划线（_）、冒号（:）和小数点（.）组成，长度为[1-255]个字符。 > - 值（value）最大长度为255个字符。  系统预留字段  1. op_svc_userid : 用户ID      当extendparam结构中的chargingMode为prePaid（即创建包年包月付费的云服务器），且使用SSH秘钥方式登录云服务器时，该字段为必选字段。  2. agency_name  :  委托的名称   委托是由租户管理员在统一身份认证服务（Identity and Access Management，IAM）上创建的，可以为弹性云服务器提供访问云服务的临时凭证。  > 说明： >  > 委托获取、更新请参考如下步骤： >  > 1. 使用IAM服务提供的[查询委托列表](https://support.huaweicloud.com/api-iam/zh-cn_topic_0079467614.html)接口，获取有效可用的委托名称。 > 2. 使用[更新云服务器元数](https://support.huaweicloud.com/api-ecs/zh-cn_topic_0025560298.html)据接口，更新metadata中agency_name字段为新的委托名称。

	Metadata map[string]string `json:"metadata,omitempty"`

	OsschedulerHints *PrePaidServerSchedulerHints `json:"os:scheduler_hints,omitempty"`
	// 弹性云服务器的标签。  标签的格式为“key.value”。其中，key的长度不超过36个字符，value的长度不超过43个字符。  标签命名时，需满足如下要求：  - 标签的key值只能包含大写字母（A~Z）、小写字母（a~z）、数字（0-9）、下划线（_）、中划线（-）以及中文字符。 - 标签的value值只能包含大写字母（A~Z）、小写字母（a~z）、数字（0-9）、下划线（_）、中划线（-）、小数点（.）以及中文字符。  > 说明： >  > 创建弹性云服务器时，一台弹性云服务器最多可以添加10个标签。 > 公有云新增server_tags字段，该字段与tags字段功能相同，支持的key、value取值范围更广，建议使用server_tags字段。

	Tags *[]string `json:"tags,omitempty"`
	// 弹性云服务器的标签。  > 说明： >  > 创建弹性云服务器时，一台弹性云服务器最多可以添加10个标签。 > 公有云新增server_tags字段，该字段与tags字段功能相同，支持的key、value取值范围更广，建议使用server_tags字段。

	ServerTags *[]PrePaidServerTag `json:"server_tags,omitempty"`
	// 云服务器描述信息，默认为空字符串。  - 长度最多允许85个字符。 - 不能包含“<” 和 “>”。

	Description *string `json:"description,omitempty"`
}

func (o PrePaidServer) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "PrePaidServer struct{}"
	}

	return strings.Join([]string{"PrePaidServer", string(data)}, " ")
}
