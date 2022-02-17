package v2

import (
	http_client "github.com/huaweicloud/huaweicloud-sdk-go-v3/core"

	"github.com/huaweicloud/huaweicloud-sdk-go-v3/services/ecs/v2/model"
)

type EcsClient struct {
	HcClient *http_client.HcHttpClient
}

func NewEcsClient(hcClient *http_client.HcHttpClient) *EcsClient {
	return &EcsClient{HcClient: hcClient}
}

func EcsClientBuilder() *http_client.HcHttpClientBuilder {
	builder := http_client.NewHcHttpClientBuilder()
	return builder
}

//将云服务器加入云服务器组。添加成功后，如果该云服务器组是反亲和性策略的，则该云服务器与云服务器组中的其他成员尽量分散地创建在不同主机上。如果该云服务器时故障域类型的，则该云服务器会拥有故障域属性。
func (c *EcsClient) AddServerGroupMember(request *model.AddServerGroupMemberRequest) (*model.AddServerGroupMemberResponse, error) {
	requestDef := GenReqDefForAddServerGroupMember()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.AddServerGroupMemberResponse), nil
	}
}

//虚拟IP地址用于为网卡提供第二个IP地址，同时支持与多个弹性云服务器的网卡绑定，从而实现多个弹性云服务器之间的高可用性。  该接口用于给云服务器网卡配置虚拟IP地址：  - 当指定的IP地址是一个不存在的虚拟IP地址时，系统会创建该虚拟IP，并绑定至对应网卡。  - 当指定的IP地址是一个已经创建好的私有IP时，系统会将指定的网卡和虚拟IP绑定。如果该IP的device_owner为空，则仅支持VPC内二三层通信；如果该IP的device_owner为neutron:VIP_PORT，则支持VPC内二三层通信、VPC之间对等连接访问，以及弹性公网IP、VPN、云专线等Internet接入。
func (c *EcsClient) AssociateServerVirtualIp(request *model.AssociateServerVirtualIpRequest) (*model.AssociateServerVirtualIpResponse, error) {
	requestDef := GenReqDefForAssociateServerVirtualIp()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.AssociateServerVirtualIpResponse), nil
	}
}

//把磁盘挂载到弹性云服务器上。
func (c *EcsClient) AttachServerVolume(request *model.AttachServerVolumeRequest) (*model.AttachServerVolumeResponse, error) {
	requestDef := GenReqDefForAttachServerVolume()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.AttachServerVolumeResponse), nil
	}
}

//给云服务器添加一张或多张网卡。
func (c *EcsClient) BatchAddServerNics(request *model.BatchAddServerNicsRequest) (*model.BatchAddServerNicsResponse, error) {
	requestDef := GenReqDefForBatchAddServerNics()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.BatchAddServerNicsResponse), nil
	}
}

//将指定的共享磁盘一次性挂载到多个弹性云服务器，实现批量挂载。
func (c *EcsClient) BatchAttachSharableVolumes(request *model.BatchAttachSharableVolumesRequest) (*model.BatchAttachSharableVolumesResponse, error) {
	requestDef := GenReqDefForBatchAttachSharableVolumes()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.BatchAttachSharableVolumesResponse), nil
	}
}

//- 为指定云服务器批量添加标签。  - 标签管理服务TMS使用该接口批量管理云服务器的标签。
func (c *EcsClient) BatchCreateServerTags(request *model.BatchCreateServerTagsRequest) (*model.BatchCreateServerTagsResponse, error) {
	requestDef := GenReqDefForBatchCreateServerTags()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.BatchCreateServerTagsResponse), nil
	}
}

//卸载并删除云服务器中的一张或多张网卡。
func (c *EcsClient) BatchDeleteServerNics(request *model.BatchDeleteServerNicsRequest) (*model.BatchDeleteServerNicsResponse, error) {
	requestDef := GenReqDefForBatchDeleteServerNics()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.BatchDeleteServerNicsResponse), nil
	}
}

//- 为指定云服务器批量删除标签。  - 标签管理服务TMS使用该接口批量管理云服务器的标签。
func (c *EcsClient) BatchDeleteServerTags(request *model.BatchDeleteServerTagsRequest) (*model.BatchDeleteServerTagsResponse, error) {
	requestDef := GenReqDefForBatchDeleteServerTags()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.BatchDeleteServerTagsResponse), nil
	}
}

//根据给定的云服务器ID列表，批量重启云服务器，一次最多可以重启1000台。
func (c *EcsClient) BatchRebootServers(request *model.BatchRebootServersRequest) (*model.BatchRebootServersResponse, error) {
	requestDef := GenReqDefForBatchRebootServers()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.BatchRebootServersResponse), nil
	}
}

//批量重置弹性云服务器管理帐号（root用户或Administrator用户）的密码。
func (c *EcsClient) BatchResetServersPassword(request *model.BatchResetServersPasswordRequest) (*model.BatchResetServersPasswordResponse, error) {
	requestDef := GenReqDefForBatchResetServersPassword()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.BatchResetServersPasswordResponse), nil
	}
}

//根据给定的云服务器ID列表，批量启动云服务器，一次最多可以启动1000台。
func (c *EcsClient) BatchStartServers(request *model.BatchStartServersRequest) (*model.BatchStartServersResponse, error) {
	requestDef := GenReqDefForBatchStartServers()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.BatchStartServersResponse), nil
	}
}

//根据给定的云服务器ID列表，批量关闭云服务器，一次最多可以关闭1000台。
func (c *EcsClient) BatchStopServers(request *model.BatchStopServersRequest) (*model.BatchStopServersResponse, error) {
	requestDef := GenReqDefForBatchStopServers()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.BatchStopServersResponse), nil
	}
}

//批量修改弹性云服务器信息。 当前仅支持批量修改云服务器名称，一次最多可以修改1000台。
func (c *EcsClient) BatchUpdateServersName(request *model.BatchUpdateServersNameRequest) (*model.BatchUpdateServersNameResponse, error) {
	requestDef := GenReqDefForBatchUpdateServersName()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.BatchUpdateServersNameResponse), nil
	}
}

//切换弹性云服务器操作系统。支持弹性云服务器数据盘不变的情况下，使用新镜像重装系统盘。  调用该接口后，系统将卸载系统盘，然后使用新镜像重新创建系统盘，并挂载至弹性云服务器，实现切换操作系统功能。
func (c *EcsClient) ChangeServerOsWithCloudInit(request *model.ChangeServerOsWithCloudInitRequest) (*model.ChangeServerOsWithCloudInitResponse, error) {
	requestDef := GenReqDefForChangeServerOsWithCloudInit()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ChangeServerOsWithCloudInitResponse), nil
	}
}

//切换弹性云服务器操作系统。  该接口支持未安装Cloud-init或Cloudbase-init的镜像使用。
func (c *EcsClient) ChangeServerOsWithoutCloudInit(request *model.ChangeServerOsWithoutCloudInitRequest) (*model.ChangeServerOsWithoutCloudInitResponse, error) {
	requestDef := GenReqDefForChangeServerOsWithoutCloudInit()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ChangeServerOsWithoutCloudInitResponse), nil
	}
}

//创建一台或多台[按需付费](https://support.huaweicloud.com/productdesc-ecs/ecs_01_0065.html)方式的云服务器。  弹性云服务器的登录鉴权方式包括两种：密钥对、密码。为安全起见，推荐使用密钥对方式。  - 密钥对 密钥对指使用密钥对作为弹性云服务器的鉴权方式。 接口调用方法：使用key_name字段，指定弹性云服务器登录时使用的密钥文件。  - 密码 密码指使用设置初始密码方式作为弹性云服务器的鉴权方式，此时，您可以通过用户名密码方式登录弹性云服务器，Linux操作系统时为root用户的初始密码，Windows操作系统时为Administrator用户的初始密码。  接口调用方法：使用adminPass字段，指定管理员帐号的初始登录密码。对于镜像已安装Cloud-init的Linux云服务器，如果需要使用密文密码，可以使用user_data字段进行密码注入。  > 对于安装Cloud-init镜像的Linux云服务器云主机，若指定user_data字段，则adminPass字段无效。
func (c *EcsClient) CreatePostPaidServers(request *model.CreatePostPaidServersRequest) (*model.CreatePostPaidServersResponse, error) {
	requestDef := GenReqDefForCreatePostPaidServers()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.CreatePostPaidServersResponse), nil
	}
}

//创建弹性云服务器组。  与原生的创建云服务器组接口不同之处在于该接口支持企业项目细粒度权限的校验。
func (c *EcsClient) CreateServerGroup(request *model.CreateServerGroupRequest) (*model.CreateServerGroupResponse, error) {
	requestDef := GenReqDefForCreateServerGroup()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.CreateServerGroupResponse), nil
	}
}

//创建一台或多台云服务器。  指该接口兼容《弹性云服务器接口参考》创建云服务器v1的功能，同时合入新功能，支持创建[包年/包月](https://support.huaweicloud.com/productdesc-ecs/ecs_01_0065.html)的弹性云服务器。  弹性云服务器的登录鉴权方式包括两种：密钥对、密码。为安全起见，推荐使用密钥对方式。  - 密钥对  指使用密钥对作为弹性云服务器的鉴权方式。  接口调用方法：使用key_name字段，指定弹性云服务器登录时使用的密钥文件。  - 密码  指使用设置初始密码方式作为弹性云服务器的鉴权方式，此时，您可以通过用户名密码方式登录弹性云服务器，Linux操作系统时为root用户的初始密码，Windows操作系统时为Administrator用户的初始密码。  接口调用方法：使用adminPass字段，指定管理员帐号的初始登录密码。对于镜像已安装Cloud-init的Linux云服务器，如果需要使用密文密码，可以使用user_data字段进行密码注入。  > 对于安装Cloud-init镜像的Linux云服务器云主机，若指定user_data字段，则adminPass字段无效。  购买操作示例： - [使用API购买ECS过程中常见问题及处理方法](https://support.huaweicloud.com/api-ecs/ecs_04_0007.html) - [获取Token并检验Token的有效期 ](https://support.huaweicloud.com/api-ecs/ecs_04_0008.html)
func (c *EcsClient) CreateServers(request *model.CreateServersRequest) (*model.CreateServersResponse, error) {
	requestDef := GenReqDefForCreateServers()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.CreateServersResponse), nil
	}
}

//删除云服务器组。  与原生的删除云服务器组接口不同之处在于该接口支持企业项目细粒度权限的校验。
func (c *EcsClient) DeleteServerGroup(request *model.DeleteServerGroupRequest) (*model.DeleteServerGroupResponse, error) {
	requestDef := GenReqDefForDeleteServerGroup()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.DeleteServerGroupResponse), nil
	}
}

//将弹性云服务器移出云服务器组。移出后，该云服务器与云服务器组中的成员不再遵从反亲和策略。
func (c *EcsClient) DeleteServerGroupMember(request *model.DeleteServerGroupMemberRequest) (*model.DeleteServerGroupMemberResponse, error) {
	requestDef := GenReqDefForDeleteServerGroupMember()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.DeleteServerGroupMemberResponse), nil
	}
}

//删除云服务器指定元数据。
func (c *EcsClient) DeleteServerMetadata(request *model.DeleteServerMetadataRequest) (*model.DeleteServerMetadataResponse, error) {
	requestDef := GenReqDefForDeleteServerMetadata()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.DeleteServerMetadataResponse), nil
	}
}

//清除Windows云服务器初始安装时系统生成的密码记录。清除密码后，不影响云服务器密码登录功能，但不能再使用获取密码功能来查询该云服务器密码。
func (c *EcsClient) DeleteServerPassword(request *model.DeleteServerPasswordRequest) (*model.DeleteServerPasswordResponse, error) {
	requestDef := GenReqDefForDeleteServerPassword()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.DeleteServerPasswordResponse), nil
	}
}

//根据指定的云服务器ID列表，删除云服务器。  系统支持删除单台云服务器和批量删除多台云服务器操作，批量删除云服务器时，一次最多可以删除1000台。
func (c *EcsClient) DeleteServers(request *model.DeleteServersRequest) (*model.DeleteServersResponse, error) {
	requestDef := GenReqDefForDeleteServers()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.DeleteServersResponse), nil
	}
}

//从弹性云服务器中卸载磁盘。
func (c *EcsClient) DetachServerVolume(request *model.DetachServerVolumeRequest) (*model.DetachServerVolumeResponse, error) {
	requestDef := GenReqDefForDetachServerVolume()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.DetachServerVolumeResponse), nil
	}
}

//虚拟IP地址用于为网卡提供第二个IP地址，同时支持与多个弹性云服务器的网卡绑定，从而实现多个弹性云服务器之间的高可用性。  该接口用于解绑定弹性云服务器网卡的虚拟IP地址。解绑后，网卡不会被删除。
func (c *EcsClient) DisassociateServerVirtualIp(request *model.DisassociateServerVirtualIpRequest) (*model.DisassociateServerVirtualIpResponse, error) {
	requestDef := GenReqDefForDisassociateServerVirtualIp()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.DisassociateServerVirtualIpResponse), nil
	}
}

//查询云服务器规格详情信息和规格扩展信息列表。
func (c *EcsClient) ListFlavors(request *model.ListFlavorsRequest) (*model.ListFlavorsResponse, error) {
	requestDef := GenReqDefForListFlavors()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ListFlavorsResponse), nil
	}
}

//变更规格时，部分规格的云服务器之间不能互相变更。您可以通过本接口，通过指定弹性云服务器规格，查询该规格可以变更的规格列表。
func (c *EcsClient) ListResizeFlavors(request *model.ListResizeFlavorsRequest) (*model.ListResizeFlavorsResponse, error) {
	requestDef := GenReqDefForListResizeFlavors()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ListResizeFlavorsResponse), nil
	}
}

//查询弹性云服务器挂载的磁盘信息。
func (c *EcsClient) ListServerBlockDevices(request *model.ListServerBlockDevicesRequest) (*model.ListServerBlockDevicesResponse, error) {
	requestDef := GenReqDefForListServerBlockDevices()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ListServerBlockDevicesResponse), nil
	}
}

//查询弹性云服务器组。  与原生的创建云服务器组接口不同之处在于该接口支持企业项目细粒度权限的校验。
func (c *EcsClient) ListServerGroups(request *model.ListServerGroupsRequest) (*model.ListServerGroupsResponse, error) {
	requestDef := GenReqDefForListServerGroups()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ListServerGroupsResponse), nil
	}
}

//查询云服务器网卡信息。
func (c *EcsClient) ListServerInterfaces(request *model.ListServerInterfacesRequest) (*model.ListServerInterfacesResponse, error) {
	requestDef := GenReqDefForListServerInterfaces()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ListServerInterfacesResponse), nil
	}
}

//项目（Project）用于将OpenStack的资源（计算资源、存储资源和网络资源）进行分组和隔离。项目可以是一个部门或者一个项目组。一个帐户中可以创建多个项目。  该接口用于查询用户在指定项目所使用的全部标签。
func (c *EcsClient) ListServerTags(request *model.ListServerTagsRequest) (*model.ListServerTagsResponse, error) {
	requestDef := GenReqDefForListServerTags()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ListServerTagsResponse), nil
	}
}

//根据用户请求条件从数据库筛选、查询所有的弹性云服务器，并关联相关表获取到弹性云服务器的详细信息。  该接口支持查询弹性云服务器计费方式，以及是否被冻结。
func (c *EcsClient) ListServersDetails(request *model.ListServersDetailsRequest) (*model.ListServersDetailsResponse, error) {
	requestDef := GenReqDefForListServersDetails()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ListServersDetailsResponse), nil
	}
}

//- 将部署在专属主机上的弹性云服务器迁移至其他专属主机。 - 将部署在专属主机上的弹性云服务器迁移至公共资源池，即不再部署在专属主机上。 - 将公共资源池的弹性云服务器迁移至专属主机上，成为专属主机上部署的弹性云服务器。
func (c *EcsClient) MigrateServer(request *model.MigrateServerRequest) (*model.MigrateServerResponse, error) {
	requestDef := GenReqDefForMigrateServer()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.MigrateServerResponse), nil
	}
}

//为弹性云服务器添加一个安全组。  添加多个安全组时，建议最多为弹性云服务器添加5个安全组。
func (c *EcsClient) NovaAssociateSecurityGroup(request *model.NovaAssociateSecurityGroupRequest) (*model.NovaAssociateSecurityGroupResponse, error) {
	requestDef := GenReqDefForNovaAssociateSecurityGroup()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NovaAssociateSecurityGroupResponse), nil
	}
}

//创建SSH密钥，或把公钥导入系统，生成密钥对。  创建SSH密钥成功后，请把响应数据中的私钥内容保存到本地文件，用户使用该私钥登录云服务器云主机。为保证云服务器云主机器安全，私钥数据只能读取一次，请妥善保管。
func (c *EcsClient) NovaCreateKeypair(request *model.NovaCreateKeypairRequest) (*model.NovaCreateKeypairResponse, error) {
	requestDef := GenReqDefForNovaCreateKeypair()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NovaCreateKeypairResponse), nil
	}
}

//创建一台弹性云服务器。  弹性云服务器创建完成后，如需开启自动恢复功能，可以调用配置云服务器自动恢复的接口，具体使用请参见管理云服务器自动恢复动作。  该接口在云服务器创建失败后不支持自动回滚。若需要自动回滚能力，可以调用POST /v1/{project_id}/cloudservers接口，具体使用请参见创建云服务器（按需）。
func (c *EcsClient) NovaCreateServers(request *model.NovaCreateServersRequest) (*model.NovaCreateServersResponse, error) {
	requestDef := GenReqDefForNovaCreateServers()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NovaCreateServersResponse), nil
	}
}

//根据SSH密钥的名称，删除指定SSH密钥。
func (c *EcsClient) NovaDeleteKeypair(request *model.NovaDeleteKeypairRequest) (*model.NovaDeleteKeypairResponse, error) {
	requestDef := GenReqDefForNovaDeleteKeypair()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NovaDeleteKeypairResponse), nil
	}
}

//删除一台云服务器。
func (c *EcsClient) NovaDeleteServer(request *model.NovaDeleteServerRequest) (*model.NovaDeleteServerResponse, error) {
	requestDef := GenReqDefForNovaDeleteServer()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NovaDeleteServerResponse), nil
	}
}

//移除弹性云服务器中的安全组。
func (c *EcsClient) NovaDisassociateSecurityGroup(request *model.NovaDisassociateSecurityGroupRequest) (*model.NovaDisassociateSecurityGroupResponse, error) {
	requestDef := GenReqDefForNovaDisassociateSecurityGroup()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NovaDisassociateSecurityGroupResponse), nil
	}
}

//查询可用域列表。
func (c *EcsClient) NovaListAvailabilityZones(request *model.NovaListAvailabilityZonesRequest) (*model.NovaListAvailabilityZonesResponse, error) {
	requestDef := GenReqDefForNovaListAvailabilityZones()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NovaListAvailabilityZonesResponse), nil
	}
}

//查询SSH密钥信息列表。
func (c *EcsClient) NovaListKeypairs(request *model.NovaListKeypairsRequest) (*model.NovaListKeypairsResponse, error) {
	requestDef := GenReqDefForNovaListKeypairs()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NovaListKeypairsResponse), nil
	}
}

//查询指定弹性云服务器的安全组。
func (c *EcsClient) NovaListServerSecurityGroups(request *model.NovaListServerSecurityGroupsRequest) (*model.NovaListServerSecurityGroupsResponse, error) {
	requestDef := GenReqDefForNovaListServerSecurityGroups()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NovaListServerSecurityGroupsResponse), nil
	}
}

//查询云服务器详情信息列表。
func (c *EcsClient) NovaListServersDetails(request *model.NovaListServersDetailsRequest) (*model.NovaListServersDetailsResponse, error) {
	requestDef := GenReqDefForNovaListServersDetails()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NovaListServersDetailsResponse), nil
	}
}

//根据SSH密钥名称查询指定SSH密钥。
func (c *EcsClient) NovaShowKeypair(request *model.NovaShowKeypairRequest) (*model.NovaShowKeypairResponse, error) {
	requestDef := GenReqDefForNovaShowKeypair()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NovaShowKeypairResponse), nil
	}
}

//根据云服务器ID，查询云服务器的详细信息。
func (c *EcsClient) NovaShowServer(request *model.NovaShowServerRequest) (*model.NovaShowServerResponse, error) {
	requestDef := GenReqDefForNovaShowServer()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NovaShowServerResponse), nil
	}
}

//配置、删除云服务器自动恢复动作。
func (c *EcsClient) RegisterServerAutoRecovery(request *model.RegisterServerAutoRecoveryRequest) (*model.RegisterServerAutoRecoveryResponse, error) {
	requestDef := GenReqDefForRegisterServerAutoRecovery()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.RegisterServerAutoRecoveryResponse), nil
	}
}

//重装弹性云服务器的操作系统。支持弹性云服务器数据盘不变的情况下，使用原镜像重装系统盘。  调用该接口后，系统将卸载系统盘，然后使用原镜像重新创建系统盘，并挂载至弹性云服务器，实现重装操作系统功能。
func (c *EcsClient) ReinstallServerWithCloudInit(request *model.ReinstallServerWithCloudInitRequest) (*model.ReinstallServerWithCloudInitResponse, error) {
	requestDef := GenReqDefForReinstallServerWithCloudInit()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ReinstallServerWithCloudInitResponse), nil
	}
}

//重装弹性云服务器的操作系统。  该接口支持未安装Cloud-init或Cloudbase-init的镜像。
func (c *EcsClient) ReinstallServerWithoutCloudInit(request *model.ReinstallServerWithoutCloudInitRequest) (*model.ReinstallServerWithoutCloudInitResponse, error) {
	requestDef := GenReqDefForReinstallServerWithoutCloudInit()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ReinstallServerWithoutCloudInitResponse), nil
	}
}

//重置弹性云服务器管理帐号（root用户或Administrator用户）的密码。
func (c *EcsClient) ResetServerPassword(request *model.ResetServerPasswordRequest) (*model.ResetServerPasswordResponse, error) {
	requestDef := GenReqDefForResetServerPassword()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ResetServerPasswordResponse), nil
	}
}

//当您创建的弹性云服务器规格无法满足业务需要时，可以变更云服务器规格，升级vCPU、内存。具体接口的使用，请参见本节内容。  变更规格时，部分规格的云服务器之间不能互相变更。  您可以通过接口“/v1/{project_id}/cloudservers/resize_flavors?{instance_uuid,source_flavor_id,source_flavor_name}”查询支持列表。
func (c *EcsClient) ResizePostPaidServer(request *model.ResizePostPaidServerRequest) (*model.ResizePostPaidServerResponse, error) {
	requestDef := GenReqDefForResizePostPaidServer()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ResizePostPaidServerResponse), nil
	}
}

//变更云服务器规格。  v1.1版本：指该接口兼容v1接口的功能，同时合入新功能，支持变更包年/包月弹性云服务器的规格。  注意事项：  - 该接口可以使用合作伙伴自身的AK/SK或者token调用，也可以用合作伙伴子客户的AK/SK或者token来调用。 - 如果使用AK/SK认证方式，示例代码中region请参考[地区和终端节点](https://developer.huaweicloud.com/endpoint)中“弹性云服务 ECS”下“区域”的内容，，serviceName（英文服务名称缩写）请指定为ECS。 - Endpoint请参考[地区和终端节点](https://developer.huaweicloud.com/endpoint)中“弹性云服务 ECS”下“终端节点（Endpoint）”的内容。
func (c *EcsClient) ResizeServer(request *model.ResizeServerRequest) (*model.ResizeServerResponse, error) {
	requestDef := GenReqDefForResizeServer()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ResizeServerResponse), nil
	}
}

//查询弹性云服务器是否支持一键重置密码。
func (c *EcsClient) ShowResetPasswordFlag(request *model.ShowResetPasswordFlagRequest) (*model.ShowResetPasswordFlagResponse, error) {
	requestDef := GenReqDefForShowResetPasswordFlag()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ShowResetPasswordFlagResponse), nil
	}
}

//查询弹性云服务器的详细信息。  该接口支持查询弹性云服务器的计费方式，以及是否被冻结。
func (c *EcsClient) ShowServer(request *model.ShowServerRequest) (*model.ShowServerResponse, error) {
	requestDef := GenReqDefForShowServer()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ShowServerResponse), nil
	}
}

//查询云服务器是否配置了自动恢复动作。
func (c *EcsClient) ShowServerAutoRecovery(request *model.ShowServerAutoRecoveryRequest) (*model.ShowServerAutoRecoveryResponse, error) {
	requestDef := GenReqDefForShowServerAutoRecovery()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ShowServerAutoRecoveryResponse), nil
	}
}

//查询弹性云服务器挂载的单个磁盘信息。
func (c *EcsClient) ShowServerBlockDevice(request *model.ShowServerBlockDeviceRequest) (*model.ShowServerBlockDeviceResponse, error) {
	requestDef := GenReqDefForShowServerBlockDevice()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ShowServerBlockDeviceResponse), nil
	}
}

//查询弹性云服务器组详情。  与原生的创建云服务器组接口不同之处在于该接口支持企业项目细粒度权限的校验。
func (c *EcsClient) ShowServerGroup(request *model.ShowServerGroupRequest) (*model.ShowServerGroupResponse, error) {
	requestDef := GenReqDefForShowServerGroup()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ShowServerGroupResponse), nil
	}
}

//查询租户配额信息。
func (c *EcsClient) ShowServerLimits(request *model.ShowServerLimitsRequest) (*model.ShowServerLimitsResponse, error) {
	requestDef := GenReqDefForShowServerLimits()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ShowServerLimitsResponse), nil
	}
}

//当通过支持Cloudbase-init功能的镜像创建Windows云服务器时，获取云服务器初始安装时系统生成的管理员帐户（Administrator帐户或Cloudbase-init设置的帐户）随机密码。
func (c *EcsClient) ShowServerPassword(request *model.ShowServerPasswordRequest) (*model.ShowServerPasswordResponse, error) {
	requestDef := GenReqDefForShowServerPassword()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ShowServerPasswordResponse), nil
	}
}

//获取弹性云服务器VNC远程登录地址。
func (c *EcsClient) ShowServerRemoteConsole(request *model.ShowServerRemoteConsoleRequest) (*model.ShowServerRemoteConsoleResponse, error) {
	requestDef := GenReqDefForShowServerRemoteConsole()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ShowServerRemoteConsoleResponse), nil
	}
}

//- 查询指定云服务器的标签信息。  - 标签管理服务TMS使用该接口查询指定云服务器的全部标签数据。
func (c *EcsClient) ShowServerTags(request *model.ShowServerTagsRequest) (*model.ShowServerTagsResponse, error) {
	requestDef := GenReqDefForShowServerTags()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ShowServerTagsResponse), nil
	}
}

//修改云服务器信息，目前支持修改云服务器名称及描述和hostname。
func (c *EcsClient) UpdateServer(request *model.UpdateServerRequest) (*model.UpdateServerResponse, error) {
	requestDef := GenReqDefForUpdateServer()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.UpdateServerResponse), nil
	}
}

//修改按需服务器，设置定时销毁时间。如果设置的销毁时间为空，表示取消销毁时间。  该接口支持企业项目细粒度权限的校验，具体细粒度请参见 ecs:cloudServers:put。
func (c *EcsClient) UpdateServerAutoTerminateTime(request *model.UpdateServerAutoTerminateTimeRequest) (*model.UpdateServerAutoTerminateTimeResponse, error) {
	requestDef := GenReqDefForUpdateServerAutoTerminateTime()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.UpdateServerAutoTerminateTimeResponse), nil
	}
}

//更新云服务器元数据。  - 如果元数据中没有待更新字段，则自动添加该字段。  - 如果元数据中已存在待更新字段，则直接更新字段值。  - 如果元数据中的字段不再请求参数中，则保持不变
func (c *EcsClient) UpdateServerMetadata(request *model.UpdateServerMetadataRequest) (*model.UpdateServerMetadataResponse, error) {
	requestDef := GenReqDefForUpdateServerMetadata()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.UpdateServerMetadataResponse), nil
	}
}

//查询Job的执行状态。  对于创建云服务器、删除云服务器、云服务器批量操作和网卡操作等异步API，命令下发后，会返回job_id，通过job_id可以查询任务的执行状态。
func (c *EcsClient) ShowJob(request *model.ShowJobRequest) (*model.ShowJobResponse, error) {
	requestDef := GenReqDefForShowJob()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ShowJobResponse), nil
	}
}
