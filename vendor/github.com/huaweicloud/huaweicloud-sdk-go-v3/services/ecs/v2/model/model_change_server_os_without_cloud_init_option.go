package model

import (
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/core/utils"

	"strings"
)

// 重装操作系统body体。
type ChangeServerOsWithoutCloudInitOption struct {
	// 云服务器管理员帐户的初始登录密码。  其中，Windows管理员帐户的用户名为Administrator。  建议密码复杂度如下：  - 长度为8-26位。 - 密码至少必须包含大写字母、小写字母、数字和特殊字符（!@$%^-_=+[{}]:,./?）中的三种。  > 说明： >  - 对于Windows弹性云服务器，密码不能包含用户名或用户名的逆序，不能包含用户名中超过两个连续字符的部分。 - adminpass和keyname不能同时为空。

	Adminpass *string `json:"adminpass,omitempty"`
	// 密钥名称。  密钥可以通过密钥创建接口进行创建（请参见[创建和导入SSH密钥](https://support.huaweicloud.com/api-ecs/zh-cn_topic_0020212678.html)），或使用SSH密钥查询接口查询已有的密钥（请参见[查询SSH密钥列表](https://support.huaweicloud.com/api-ecs/ecs_03_1201.html) ）。

	Keyname *string `json:"keyname,omitempty"`
	// 用户ID。 说明 如果使用秘钥方式切换操作系统，则该字段为必选字段。

	Userid *string `json:"userid,omitempty"`
	// 切换系统所使用的新镜像的ID，格式为UUID。  镜像的ID可以从控制台或者参考[《镜像服务API参考》](https://support.huaweicloud.com/api-ims/ims_03_0702.html)的“查询镜像列表”的章节获取。

	Imageid string `json:"imageid"`
	// 取值为withStopServer ，支持开机状态下切换弹性云服务器操作系统。  mode取值为withStopServer时，对开机状态的  弹性云服务器执行切换操作系统操作，系统自动对云服务器先执行关机，再切换操作系统。

	Mode *string `json:"mode,omitempty"`
}

func (o ChangeServerOsWithoutCloudInitOption) String() string {
	data, err := utils.Marshal(o)
	if err != nil {
		return "ChangeServerOsWithoutCloudInitOption struct{}"
	}

	return strings.Join([]string{"ChangeServerOsWithoutCloudInitOption", string(data)}, " ")
}
