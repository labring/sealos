package v2

import (
	http_client "github.com/huaweicloud/huaweicloud-sdk-go-v3/core"

	"github.com/huaweicloud/huaweicloud-sdk-go-v3/services/vpc/v2/model"
)

type VpcClient struct {
	HcClient *http_client.HcHttpClient
}

func NewVpcClient(hcClient *http_client.HcHttpClient) *VpcClient {
	return &VpcClient{HcClient: hcClient}
}

func VpcClientBuilder() *http_client.HcHttpClientBuilder {
	builder := http_client.NewHcHttpClientBuilder()
	return builder
}

//租户A名下的VPC申请和租户B的VPC建立对等连接，需要等待租户B接受该请求。此接口用于租户接受其他租户发起的对等连接请求。
func (c *VpcClient) AcceptVpcPeering(request *model.AcceptVpcPeeringRequest) (*model.AcceptVpcPeeringResponse, error) {
	requestDef := GenReqDefForAcceptVpcPeering()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.AcceptVpcPeeringResponse), nil
	}
}

//路由表关联子网。子网关联路由表A后，再关联B，不需要先跟路由表A解关联再关联路由表B
func (c *VpcClient) AssociateRouteTable(request *model.AssociateRouteTableRequest) (*model.AssociateRouteTableResponse, error) {
	requestDef := GenReqDefForAssociateRouteTable()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.AssociateRouteTableResponse), nil
	}
}

//为指定的子网资源实例批量添加标签。 此接口为幂等接口：创建时如果请求体中存在重复key则报错。创建时，不允许设置重复key数据，如果数据库已存在该key，就覆盖value的值。
func (c *VpcClient) BatchCreateSubnetTags(request *model.BatchCreateSubnetTagsRequest) (*model.BatchCreateSubnetTagsResponse, error) {
	requestDef := GenReqDefForBatchCreateSubnetTags()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.BatchCreateSubnetTagsResponse), nil
	}
}

//为指定的子网资源实例批量删除标签 此接口为幂等接口：删除时，如果删除的标签不存在，默认处理成功；删除时不对标签字符集范围做校验。删除时tags结构体不能缺失，key不能为空，或者空字符串。
func (c *VpcClient) BatchDeleteSubnetTags(request *model.BatchDeleteSubnetTagsRequest) (*model.BatchDeleteSubnetTagsResponse, error) {
	requestDef := GenReqDefForBatchDeleteSubnetTags()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.BatchDeleteSubnetTagsResponse), nil
	}
}

//创建端口。
func (c *VpcClient) CreatePort(request *model.CreatePortRequest) (*model.CreatePortResponse, error) {
	requestDef := GenReqDefForCreatePort()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.CreatePortResponse), nil
	}
}

//创建路由表
func (c *VpcClient) CreateRouteTable(request *model.CreateRouteTableRequest) (*model.CreateRouteTableResponse, error) {
	requestDef := GenReqDefForCreateRouteTable()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.CreateRouteTableResponse), nil
	}
}

//创建安全组。
func (c *VpcClient) CreateSecurityGroup(request *model.CreateSecurityGroupRequest) (*model.CreateSecurityGroupResponse, error) {
	requestDef := GenReqDefForCreateSecurityGroup()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.CreateSecurityGroupResponse), nil
	}
}

//创建安全组规则。
func (c *VpcClient) CreateSecurityGroupRule(request *model.CreateSecurityGroupRuleRequest) (*model.CreateSecurityGroupRuleResponse, error) {
	requestDef := GenReqDefForCreateSecurityGroupRule()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.CreateSecurityGroupRuleResponse), nil
	}
}

//创建子网。
func (c *VpcClient) CreateSubnet(request *model.CreateSubnetRequest) (*model.CreateSubnetResponse, error) {
	requestDef := GenReqDefForCreateSubnet()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.CreateSubnetResponse), nil
	}
}

//给指定子网资源实例增加标签信息。 此接口为幂等接口：创建时，如果创建的标签已经存在（key相同），则覆盖。
func (c *VpcClient) CreateSubnetTag(request *model.CreateSubnetTagRequest) (*model.CreateSubnetTagResponse, error) {
	requestDef := GenReqDefForCreateSubnetTag()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.CreateSubnetTagResponse), nil
	}
}

//创建对等连接。
func (c *VpcClient) CreateVpcPeering(request *model.CreateVpcPeeringRequest) (*model.CreateVpcPeeringResponse, error) {
	requestDef := GenReqDefForCreateVpcPeering()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.CreateVpcPeeringResponse), nil
	}
}

//删除端口。
func (c *VpcClient) DeletePort(request *model.DeletePortRequest) (*model.DeletePortResponse, error) {
	requestDef := GenReqDefForDeletePort()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.DeletePortResponse), nil
	}
}

//删除路由表
func (c *VpcClient) DeleteRouteTable(request *model.DeleteRouteTableRequest) (*model.DeleteRouteTableResponse, error) {
	requestDef := GenReqDefForDeleteRouteTable()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.DeleteRouteTableResponse), nil
	}
}

//删除安全组。
func (c *VpcClient) DeleteSecurityGroup(request *model.DeleteSecurityGroupRequest) (*model.DeleteSecurityGroupResponse, error) {
	requestDef := GenReqDefForDeleteSecurityGroup()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.DeleteSecurityGroupResponse), nil
	}
}

//删除安全组规则。
func (c *VpcClient) DeleteSecurityGroupRule(request *model.DeleteSecurityGroupRuleRequest) (*model.DeleteSecurityGroupRuleResponse, error) {
	requestDef := GenReqDefForDeleteSecurityGroupRule()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.DeleteSecurityGroupRuleResponse), nil
	}
}

//删除子网
func (c *VpcClient) DeleteSubnet(request *model.DeleteSubnetRequest) (*model.DeleteSubnetResponse, error) {
	requestDef := GenReqDefForDeleteSubnet()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.DeleteSubnetResponse), nil
	}
}

//删除指定子网资源实例的标签信息。 该接口为幂等接口：删除的key不存在报404，Key不能为空或者空字符串
func (c *VpcClient) DeleteSubnetTag(request *model.DeleteSubnetTagRequest) (*model.DeleteSubnetTagResponse, error) {
	requestDef := GenReqDefForDeleteSubnetTag()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.DeleteSubnetTagResponse), nil
	}
}

//删除对等连接。 可以在在本端或对端任何一端删除对等连接。
func (c *VpcClient) DeleteVpcPeering(request *model.DeleteVpcPeeringRequest) (*model.DeleteVpcPeeringResponse, error) {
	requestDef := GenReqDefForDeleteVpcPeering()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.DeleteVpcPeeringResponse), nil
	}
}

//子网解关联路由表
func (c *VpcClient) DisassociateRouteTable(request *model.DisassociateRouteTableRequest) (*model.DisassociateRouteTableResponse, error) {
	requestDef := GenReqDefForDisassociateRouteTable()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.DisassociateRouteTableResponse), nil
	}
}

//查询提交请求的租户的所有端口，单次查询最多返回2000条数据。
func (c *VpcClient) ListPorts(request *model.ListPortsRequest) (*model.ListPortsResponse, error) {
	requestDef := GenReqDefForListPorts()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ListPortsResponse), nil
	}
}

//查询提交请求的帐户的所有路由表列表，并根据过滤条件进行过滤
func (c *VpcClient) ListRouteTables(request *model.ListRouteTablesRequest) (*model.ListRouteTablesResponse, error) {
	requestDef := GenReqDefForListRouteTables()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ListRouteTablesResponse), nil
	}
}

//查询安全组规则列表。
func (c *VpcClient) ListSecurityGroupRules(request *model.ListSecurityGroupRulesRequest) (*model.ListSecurityGroupRulesResponse, error) {
	requestDef := GenReqDefForListSecurityGroupRules()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ListSecurityGroupRulesResponse), nil
	}
}

//查询安全组列表
func (c *VpcClient) ListSecurityGroups(request *model.ListSecurityGroupsRequest) (*model.ListSecurityGroupsResponse, error) {
	requestDef := GenReqDefForListSecurityGroups()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ListSecurityGroupsResponse), nil
	}
}

//查询租户在指定区域和实例类型的所有标签集合
func (c *VpcClient) ListSubnetTags(request *model.ListSubnetTagsRequest) (*model.ListSubnetTagsResponse, error) {
	requestDef := GenReqDefForListSubnetTags()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ListSubnetTagsResponse), nil
	}
}

//查询子网列表
func (c *VpcClient) ListSubnets(request *model.ListSubnetsRequest) (*model.ListSubnetsResponse, error) {
	requestDef := GenReqDefForListSubnets()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ListSubnetsResponse), nil
	}
}

//使用标签过滤实例
func (c *VpcClient) ListSubnetsByTags(request *model.ListSubnetsByTagsRequest) (*model.ListSubnetsByTagsResponse, error) {
	requestDef := GenReqDefForListSubnetsByTags()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ListSubnetsByTagsResponse), nil
	}
}

//查询提交请求的租户的所有对等连接。根据过滤条件进行过滤。
func (c *VpcClient) ListVpcPeerings(request *model.ListVpcPeeringsRequest) (*model.ListVpcPeeringsResponse, error) {
	requestDef := GenReqDefForListVpcPeerings()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ListVpcPeeringsResponse), nil
	}
}

//租户A名下的VPC申请和租户B的VPC建立对等连接，需要等待租户B接受该请求。此接口用于租户拒绝其他租户发起的对等连接请求。
func (c *VpcClient) RejectVpcPeering(request *model.RejectVpcPeeringRequest) (*model.RejectVpcPeeringResponse, error) {
	requestDef := GenReqDefForRejectVpcPeering()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.RejectVpcPeeringResponse), nil
	}
}

//查询单个端口详情。
func (c *VpcClient) ShowPort(request *model.ShowPortRequest) (*model.ShowPortResponse, error) {
	requestDef := GenReqDefForShowPort()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ShowPortResponse), nil
	}
}

//查询单租户在VPC服务下的网络资源配额，包括vpc配额、子网配额、安全组配额、安全组规则配额、弹性公网IP配额，vpn配额等。
func (c *VpcClient) ShowQuota(request *model.ShowQuotaRequest) (*model.ShowQuotaResponse, error) {
	requestDef := GenReqDefForShowQuota()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ShowQuotaResponse), nil
	}
}

//查询路由表详情
func (c *VpcClient) ShowRouteTable(request *model.ShowRouteTableRequest) (*model.ShowRouteTableResponse, error) {
	requestDef := GenReqDefForShowRouteTable()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ShowRouteTableResponse), nil
	}
}

//查询单个安全组详情。
func (c *VpcClient) ShowSecurityGroup(request *model.ShowSecurityGroupRequest) (*model.ShowSecurityGroupResponse, error) {
	requestDef := GenReqDefForShowSecurityGroup()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ShowSecurityGroupResponse), nil
	}
}

//查询单个安全组规则详情
func (c *VpcClient) ShowSecurityGroupRule(request *model.ShowSecurityGroupRuleRequest) (*model.ShowSecurityGroupRuleResponse, error) {
	requestDef := GenReqDefForShowSecurityGroupRule()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ShowSecurityGroupRuleResponse), nil
	}
}

//查询子网详情。
func (c *VpcClient) ShowSubnet(request *model.ShowSubnetRequest) (*model.ShowSubnetResponse, error) {
	requestDef := GenReqDefForShowSubnet()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ShowSubnetResponse), nil
	}
}

//查询指定子网实例的标签信息。
func (c *VpcClient) ShowSubnetTags(request *model.ShowSubnetTagsRequest) (*model.ShowSubnetTagsResponse, error) {
	requestDef := GenReqDefForShowSubnetTags()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ShowSubnetTagsResponse), nil
	}
}

//查询对等连接详情。
func (c *VpcClient) ShowVpcPeering(request *model.ShowVpcPeeringRequest) (*model.ShowVpcPeeringResponse, error) {
	requestDef := GenReqDefForShowVpcPeering()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ShowVpcPeeringResponse), nil
	}
}

//更新端口。
func (c *VpcClient) UpdatePort(request *model.UpdatePortRequest) (*model.UpdatePortResponse, error) {
	requestDef := GenReqDefForUpdatePort()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.UpdatePortResponse), nil
	}
}

//更新路由表，包括可以更新路由表的名称，描述，以及新增、更新、删除路由条目
func (c *VpcClient) UpdateRouteTable(request *model.UpdateRouteTableRequest) (*model.UpdateRouteTableResponse, error) {
	requestDef := GenReqDefForUpdateRouteTable()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.UpdateRouteTableResponse), nil
	}
}

//更新子网。
func (c *VpcClient) UpdateSubnet(request *model.UpdateSubnetRequest) (*model.UpdateSubnetResponse, error) {
	requestDef := GenReqDefForUpdateSubnet()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.UpdateSubnetResponse), nil
	}
}

//更新对等连接。
func (c *VpcClient) UpdateVpcPeering(request *model.UpdateVpcPeeringRequest) (*model.UpdateVpcPeeringResponse, error) {
	requestDef := GenReqDefForUpdateVpcPeering()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.UpdateVpcPeeringResponse), nil
	}
}

//申请私有IP。
func (c *VpcClient) CreatePrivateip(request *model.CreatePrivateipRequest) (*model.CreatePrivateipResponse, error) {
	requestDef := GenReqDefForCreatePrivateip()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.CreatePrivateipResponse), nil
	}
}

//删除私有IP。
func (c *VpcClient) DeletePrivateip(request *model.DeletePrivateipRequest) (*model.DeletePrivateipResponse, error) {
	requestDef := GenReqDefForDeletePrivateip()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.DeletePrivateipResponse), nil
	}
}

//查询指定子网下的私有IP列表。
func (c *VpcClient) ListPrivateips(request *model.ListPrivateipsRequest) (*model.ListPrivateipsResponse, error) {
	requestDef := GenReqDefForListPrivateips()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ListPrivateipsResponse), nil
	}
}

//显示一个指定网络中的IPv4地址使用情况。 包括此网络中的IP总数以及已用IP总数，以及网络下每一个子网的IP地址总数和可用IP地址总数。  > 须知  - 系统预留地址指的是子网的第1个以及最后4个地址，一般用于网关、DHCP等服务。 - 这里以及下文描述的IP地址总数、已用IP地址总数不包含系统预留地址。 - 在分配IP时，用户可以指定系统预留的IP地址。但是不论IP是如何分配的，只要是处于系统预留IP地址段的IP均不会被统计到已用IP地址数目和IP地址总数中。
func (c *VpcClient) ShowNetworkIpAvailabilities(request *model.ShowNetworkIpAvailabilitiesRequest) (*model.ShowNetworkIpAvailabilitiesResponse, error) {
	requestDef := GenReqDefForShowNetworkIpAvailabilities()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ShowNetworkIpAvailabilitiesResponse), nil
	}
}

//指定ID查询私有IP。
func (c *VpcClient) ShowPrivateip(request *model.ShowPrivateipRequest) (*model.ShowPrivateipResponse, error) {
	requestDef := GenReqDefForShowPrivateip()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ShowPrivateipResponse), nil
	}
}

//创建安全组
func (c *VpcClient) NeutronCreateSecurityGroup(request *model.NeutronCreateSecurityGroupRequest) (*model.NeutronCreateSecurityGroupResponse, error) {
	requestDef := GenReqDefForNeutronCreateSecurityGroup()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NeutronCreateSecurityGroupResponse), nil
	}
}

//创建安全组规则
func (c *VpcClient) NeutronCreateSecurityGroupRule(request *model.NeutronCreateSecurityGroupRuleRequest) (*model.NeutronCreateSecurityGroupRuleResponse, error) {
	requestDef := GenReqDefForNeutronCreateSecurityGroupRule()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NeutronCreateSecurityGroupRuleResponse), nil
	}
}

//删除安全组
func (c *VpcClient) NeutronDeleteSecurityGroup(request *model.NeutronDeleteSecurityGroupRequest) (*model.NeutronDeleteSecurityGroupResponse, error) {
	requestDef := GenReqDefForNeutronDeleteSecurityGroup()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NeutronDeleteSecurityGroupResponse), nil
	}
}

//删除安全组规则
func (c *VpcClient) NeutronDeleteSecurityGroupRule(request *model.NeutronDeleteSecurityGroupRuleRequest) (*model.NeutronDeleteSecurityGroupRuleResponse, error) {
	requestDef := GenReqDefForNeutronDeleteSecurityGroupRule()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NeutronDeleteSecurityGroupRuleResponse), nil
	}
}

//查询提交请求的租户有权限查看的所有安全组规则。单次查询最多返回2000条数据，超过2000后会返回分页标记。分页查询请参考分页查询
func (c *VpcClient) NeutronListSecurityGroupRules(request *model.NeutronListSecurityGroupRulesRequest) (*model.NeutronListSecurityGroupRulesResponse, error) {
	requestDef := GenReqDefForNeutronListSecurityGroupRules()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NeutronListSecurityGroupRulesResponse), nil
	}
}

//查询提交请求租户的所有安全组，单次查询最多返回2000条数据，超过2000后会返回分页标记。分页查询请参考分页查询 。
func (c *VpcClient) NeutronListSecurityGroups(request *model.NeutronListSecurityGroupsRequest) (*model.NeutronListSecurityGroupsResponse, error) {
	requestDef := GenReqDefForNeutronListSecurityGroups()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NeutronListSecurityGroupsResponse), nil
	}
}

//查询安全组详情
func (c *VpcClient) NeutronShowSecurityGroup(request *model.NeutronShowSecurityGroupRequest) (*model.NeutronShowSecurityGroupResponse, error) {
	requestDef := GenReqDefForNeutronShowSecurityGroup()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NeutronShowSecurityGroupResponse), nil
	}
}

//查询安全组规则详情。
func (c *VpcClient) NeutronShowSecurityGroupRule(request *model.NeutronShowSecurityGroupRuleRequest) (*model.NeutronShowSecurityGroupRuleResponse, error) {
	requestDef := GenReqDefForNeutronShowSecurityGroupRule()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NeutronShowSecurityGroupRuleResponse), nil
	}
}

//更新安全组
func (c *VpcClient) NeutronUpdateSecurityGroup(request *model.NeutronUpdateSecurityGroupRequest) (*model.NeutronUpdateSecurityGroupResponse, error) {
	requestDef := GenReqDefForNeutronUpdateSecurityGroup()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NeutronUpdateSecurityGroupResponse), nil
	}
}

//插入一条网络ACL规则到某一网络ACL策略中。
func (c *VpcClient) NeutronAddFirewallRule(request *model.NeutronAddFirewallRuleRequest) (*model.NeutronAddFirewallRuleResponse, error) {
	requestDef := GenReqDefForNeutronAddFirewallRule()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NeutronAddFirewallRuleResponse), nil
	}
}

//创建网络ACL组
func (c *VpcClient) NeutronCreateFirewallGroup(request *model.NeutronCreateFirewallGroupRequest) (*model.NeutronCreateFirewallGroupResponse, error) {
	requestDef := GenReqDefForNeutronCreateFirewallGroup()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NeutronCreateFirewallGroupResponse), nil
	}
}

//创建网络ACL策略。
func (c *VpcClient) NeutronCreateFirewallPolicy(request *model.NeutronCreateFirewallPolicyRequest) (*model.NeutronCreateFirewallPolicyResponse, error) {
	requestDef := GenReqDefForNeutronCreateFirewallPolicy()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NeutronCreateFirewallPolicyResponse), nil
	}
}

//创建网络ACL规则。
func (c *VpcClient) NeutronCreateFirewallRule(request *model.NeutronCreateFirewallRuleRequest) (*model.NeutronCreateFirewallRuleResponse, error) {
	requestDef := GenReqDefForNeutronCreateFirewallRule()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NeutronCreateFirewallRuleResponse), nil
	}
}

//删除网络ACL组
func (c *VpcClient) NeutronDeleteFirewallGroup(request *model.NeutronDeleteFirewallGroupRequest) (*model.NeutronDeleteFirewallGroupResponse, error) {
	requestDef := GenReqDefForNeutronDeleteFirewallGroup()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NeutronDeleteFirewallGroupResponse), nil
	}
}

//删除网络ACL策略。
func (c *VpcClient) NeutronDeleteFirewallPolicy(request *model.NeutronDeleteFirewallPolicyRequest) (*model.NeutronDeleteFirewallPolicyResponse, error) {
	requestDef := GenReqDefForNeutronDeleteFirewallPolicy()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NeutronDeleteFirewallPolicyResponse), nil
	}
}

//删除网络ACL规则。
func (c *VpcClient) NeutronDeleteFirewallRule(request *model.NeutronDeleteFirewallRuleRequest) (*model.NeutronDeleteFirewallRuleResponse, error) {
	requestDef := GenReqDefForNeutronDeleteFirewallRule()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NeutronDeleteFirewallRuleResponse), nil
	}
}

//查询提交请求的租户有权限操作的所有网络ACL组信息。单次查询最多返回2000条数据，超过2000后会返回分页标记。
func (c *VpcClient) NeutronListFirewallGroups(request *model.NeutronListFirewallGroupsRequest) (*model.NeutronListFirewallGroupsResponse, error) {
	requestDef := GenReqDefForNeutronListFirewallGroups()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NeutronListFirewallGroupsResponse), nil
	}
}

//查询提交请求的租户有权限操作的所有网络ACL策略信息。单次查询最多返回2000条数据，超过2000后会返回分页标记。
func (c *VpcClient) NeutronListFirewallPolicies(request *model.NeutronListFirewallPoliciesRequest) (*model.NeutronListFirewallPoliciesResponse, error) {
	requestDef := GenReqDefForNeutronListFirewallPolicies()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NeutronListFirewallPoliciesResponse), nil
	}
}

//查询提交请求的租户有权限操作的所有网络ACL规则信息。单次查询最多返回2000条数据，超过2000后会返回分页标记。
func (c *VpcClient) NeutronListFirewallRules(request *model.NeutronListFirewallRulesRequest) (*model.NeutronListFirewallRulesResponse, error) {
	requestDef := GenReqDefForNeutronListFirewallRules()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NeutronListFirewallRulesResponse), nil
	}
}

//从某一网络ACL策略中移除一条网络ACL规则。
func (c *VpcClient) NeutronRemoveFirewallRule(request *model.NeutronRemoveFirewallRuleRequest) (*model.NeutronRemoveFirewallRuleResponse, error) {
	requestDef := GenReqDefForNeutronRemoveFirewallRule()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NeutronRemoveFirewallRuleResponse), nil
	}
}

//查询特定网络ACL组详情。
func (c *VpcClient) NeutronShowFirewallGroup(request *model.NeutronShowFirewallGroupRequest) (*model.NeutronShowFirewallGroupResponse, error) {
	requestDef := GenReqDefForNeutronShowFirewallGroup()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NeutronShowFirewallGroupResponse), nil
	}
}

//查询特定网络ACL策略详情。
func (c *VpcClient) NeutronShowFirewallPolicy(request *model.NeutronShowFirewallPolicyRequest) (*model.NeutronShowFirewallPolicyResponse, error) {
	requestDef := GenReqDefForNeutronShowFirewallPolicy()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NeutronShowFirewallPolicyResponse), nil
	}
}

//查询特定网络ACL规则。
func (c *VpcClient) NeutronShowFirewallRule(request *model.NeutronShowFirewallRuleRequest) (*model.NeutronShowFirewallRuleResponse, error) {
	requestDef := GenReqDefForNeutronShowFirewallRule()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NeutronShowFirewallRuleResponse), nil
	}
}

//更新网络ACL组。
func (c *VpcClient) NeutronUpdateFirewallGroup(request *model.NeutronUpdateFirewallGroupRequest) (*model.NeutronUpdateFirewallGroupResponse, error) {
	requestDef := GenReqDefForNeutronUpdateFirewallGroup()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NeutronUpdateFirewallGroupResponse), nil
	}
}

//更新网络ACL策略。
func (c *VpcClient) NeutronUpdateFirewallPolicy(request *model.NeutronUpdateFirewallPolicyRequest) (*model.NeutronUpdateFirewallPolicyResponse, error) {
	requestDef := GenReqDefForNeutronUpdateFirewallPolicy()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NeutronUpdateFirewallPolicyResponse), nil
	}
}

//更新网络ACL规则。
func (c *VpcClient) NeutronUpdateFirewallRule(request *model.NeutronUpdateFirewallRuleRequest) (*model.NeutronUpdateFirewallRuleResponse, error) {
	requestDef := GenReqDefForNeutronUpdateFirewallRule()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.NeutronUpdateFirewallRuleResponse), nil
	}
}

//为指定的VPC资源实例批量添加标签。 此接口为幂等接口：创建时如果请求体中存在重复key则报错。创建时，不允许设置重复key数据，如果数据库已存在该key，就覆盖value的值。
func (c *VpcClient) BatchCreateVpcTags(request *model.BatchCreateVpcTagsRequest) (*model.BatchCreateVpcTagsResponse, error) {
	requestDef := GenReqDefForBatchCreateVpcTags()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.BatchCreateVpcTagsResponse), nil
	}
}

//为指定的VPC资源实例批量删除标签。 此接口为幂等接口：删除时，如果删除的标签不存在，默认处理成功；删除时不对标签字符集范围做校验。删除时tags结构体不能缺失，key不能为空，或者空字符串。
func (c *VpcClient) BatchDeleteVpcTags(request *model.BatchDeleteVpcTagsRequest) (*model.BatchDeleteVpcTagsResponse, error) {
	requestDef := GenReqDefForBatchDeleteVpcTags()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.BatchDeleteVpcTagsResponse), nil
	}
}

//创建虚拟私有云。
func (c *VpcClient) CreateVpc(request *model.CreateVpcRequest) (*model.CreateVpcResponse, error) {
	requestDef := GenReqDefForCreateVpc()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.CreateVpcResponse), nil
	}
}

//给指定VPC资源实例增加标签信息 此接口为幂等接口：创建时，如果创建的标签已经存在（key相同），则覆盖。
func (c *VpcClient) CreateVpcResourceTag(request *model.CreateVpcResourceTagRequest) (*model.CreateVpcResourceTagResponse, error) {
	requestDef := GenReqDefForCreateVpcResourceTag()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.CreateVpcResourceTagResponse), nil
	}
}

//创建路由
func (c *VpcClient) CreateVpcRoute(request *model.CreateVpcRouteRequest) (*model.CreateVpcRouteResponse, error) {
	requestDef := GenReqDefForCreateVpcRoute()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.CreateVpcRouteResponse), nil
	}
}

//删除虚拟私有云。
func (c *VpcClient) DeleteVpc(request *model.DeleteVpcRequest) (*model.DeleteVpcResponse, error) {
	requestDef := GenReqDefForDeleteVpc()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.DeleteVpcResponse), nil
	}
}

//删除路由
func (c *VpcClient) DeleteVpcRoute(request *model.DeleteVpcRouteRequest) (*model.DeleteVpcRouteResponse, error) {
	requestDef := GenReqDefForDeleteVpcRoute()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.DeleteVpcRouteResponse), nil
	}
}

//删除指定VPC资源实例的标签信息 该接口为幂等接口：删除的key不存在报404，Key不能为空或者空字符串
func (c *VpcClient) DeleteVpcTag(request *model.DeleteVpcTagRequest) (*model.DeleteVpcTagResponse, error) {
	requestDef := GenReqDefForDeleteVpcTag()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.DeleteVpcTagResponse), nil
	}
}

//查询提交请求的租户的所有路由列表，并根据过滤条件进行过滤。
func (c *VpcClient) ListVpcRoutes(request *model.ListVpcRoutesRequest) (*model.ListVpcRoutesResponse, error) {
	requestDef := GenReqDefForListVpcRoutes()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ListVpcRoutesResponse), nil
	}
}

//查询租户在指定区域和实例类型的所有标签集合
func (c *VpcClient) ListVpcTags(request *model.ListVpcTagsRequest) (*model.ListVpcTagsResponse, error) {
	requestDef := GenReqDefForListVpcTags()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ListVpcTagsResponse), nil
	}
}

//查询虚拟私有云列表。
func (c *VpcClient) ListVpcs(request *model.ListVpcsRequest) (*model.ListVpcsResponse, error) {
	requestDef := GenReqDefForListVpcs()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ListVpcsResponse), nil
	}
}

//使用标签过滤实例。
func (c *VpcClient) ListVpcsByTags(request *model.ListVpcsByTagsRequest) (*model.ListVpcsByTagsResponse, error) {
	requestDef := GenReqDefForListVpcsByTags()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ListVpcsByTagsResponse), nil
	}
}

//查询虚拟私有云。
func (c *VpcClient) ShowVpc(request *model.ShowVpcRequest) (*model.ShowVpcResponse, error) {
	requestDef := GenReqDefForShowVpc()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ShowVpcResponse), nil
	}
}

//查询路由详情
func (c *VpcClient) ShowVpcRoute(request *model.ShowVpcRouteRequest) (*model.ShowVpcRouteResponse, error) {
	requestDef := GenReqDefForShowVpcRoute()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ShowVpcRouteResponse), nil
	}
}

//查询指定VPC实例的标签信息
func (c *VpcClient) ShowVpcTags(request *model.ShowVpcTagsRequest) (*model.ShowVpcTagsResponse, error) {
	requestDef := GenReqDefForShowVpcTags()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.ShowVpcTagsResponse), nil
	}
}

//更新虚拟私有云。
func (c *VpcClient) UpdateVpc(request *model.UpdateVpcRequest) (*model.UpdateVpcResponse, error) {
	requestDef := GenReqDefForUpdateVpc()

	if resp, err := c.HcClient.Sync(request, requestDef); err != nil {
		return nil, err
	} else {
		return resp.(*model.UpdateVpcResponse), nil
	}
}
