package aliyun

import (
	"fmt"
	"strconv"
	"sync"
	"time"

	"github.com/labring/sealos/pkg/utils/retry"

	"github.com/aliyun/alibaba-cloud-sdk-go/sdk/requests"

	"github.com/aliyun/alibaba-cloud-sdk-go/services/ecs"
	v1 "github.com/labring/sealos/controllers/infra/api/v1"
	"github.com/labring/sealos/controllers/infra/common"
)

var mutex sync.Mutex

type ECSCreateInstancesAPI interface {
	RunInstances(request *ecs.RunInstancesRequest) (response *ecs.RunInstancesResponse, err error)
	TagResources(requests *ecs.TagResourcesRequest) (response *ecs.TagResourcesResponse, err error)
	CreateVpc(request *ecs.CreateVpcRequest) (response *ecs.CreateVpcResponse, err error)
	CreateSecurityGroup(request *ecs.CreateSecurityGroupRequest) (response *ecs.CreateSecurityGroupResponse, err error)
	CreateVSwitch(request *ecs.CreateVSwitchRequest) (response *ecs.CreateVSwitchResponse, err error)
	DescribeVpcs(request *ecs.DescribeVpcsRequest) (response *ecs.DescribeVpcsResponse, err error)
	DescribeVSwitches(request *ecs.DescribeVSwitchesRequest) (response *ecs.DescribeVSwitchesResponse, err error)
	DescribeSecurityGroups(request *ecs.DescribeSecurityGroupsRequest) (response *ecs.DescribeSecurityGroupsResponse, err error)
	AuthorizeSecurityGroup(request *ecs.AuthorizeSecurityGroupRequest) (response *ecs.AuthorizeSecurityGroupResponse, err error)
}

func MakeInstances(api ECSCreateInstancesAPI, request *ecs.RunInstancesRequest) (*ecs.RunInstancesResponse, error) {
	return api.RunInstances(request)
}

func MakeTags(api ECSCreateInstancesAPI, request *ecs.TagResourcesRequest) (*ecs.TagResourcesResponse, error) {
	return api.TagResources(request)
}

func MakeVSwitch(api ECSCreateInstancesAPI, request *ecs.CreateVSwitchRequest) (*ecs.CreateVSwitchResponse, error) {
	return api.CreateVSwitch(request)
}

func MakeVPC(api ECSCreateInstancesAPI, request *ecs.CreateVpcRequest) (*ecs.CreateVpcResponse, error) {
	return api.CreateVpc(request)
}

func MakeSecurityGroup(api ECSCreateInstancesAPI, request *ecs.CreateSecurityGroupRequest) (*ecs.CreateSecurityGroupResponse, error) {
	return api.CreateSecurityGroup(request)
}

func GetVpcs(api ECSCreateInstancesAPI, request *ecs.DescribeVpcsRequest) (*ecs.DescribeVpcsResponse, error) {
	return api.DescribeVpcs(request)
}

func GetVSwitches(api ECSCreateInstancesAPI, request *ecs.DescribeVSwitchesRequest) (*ecs.DescribeVSwitchesResponse, error) {
	return api.DescribeVSwitches(request)
}

func GetSecurityGroups(api ECSCreateInstancesAPI, request *ecs.DescribeSecurityGroupsRequest) (*ecs.DescribeSecurityGroupsResponse, error) {
	return api.DescribeSecurityGroups(request)
}

func AuthorizeSecurityGroup(api ECSCreateInstancesAPI, request *ecs.AuthorizeSecurityGroupRequest) (*ecs.AuthorizeSecurityGroupResponse, error) {
	return api.AuthorizeSecurityGroup(request)
}

func (d Driver) createInstances(hosts *v1.Hosts, infra *v1.Infra) error {
	client := d.Client
	if hosts.Count == 0 {
		return nil
	}
	tags := getTags(hosts, infra)
	keyName := infra.Spec.SSH.PkName
	if infra.Spec.AvailabilityZone == "" {
		infra.Spec.AvailabilityZone = defaultAvailabilityZone
	}
	// get vpc
	vpcID, err := d.getOrCreateVpc(infra)
	if err != nil {
		return fmt.Errorf("failed to get or create vpc, %v", err)
	}

	// get security group
	securityGroupID, err := d.getSecurityGroup(infra, vpcID)
	if err != nil {
		return fmt.Errorf("failed to get or create security group, %v", err)
	}

	// get vswitch
	VSwitchID, err := d.getVSwitch(infra, vpcID)
	if err != nil {
		return fmt.Errorf("failed to get or create vswitch, %v", err)
	}

	// get root disk
	rootDiskVolumeType, rootDiskSize := getRootDisk(hosts)
	// get data disk
	dataDisks := getDataDisks(hosts)
	// get host name
	hostName := getHostName(hosts, infra)

	// create instance
	runInstanceRequest := &ecs.RunInstancesRequest{
		RpcRequest:              ecs.CreateRunInstancesRequest().RpcRequest,
		ZoneId:                  infra.Spec.AvailabilityZone,
		ImageId:                 hosts.Image,
		InstanceType:            hosts.Flavor,
		HostName:                hostName,
		UniqueSuffix:            "true",
		InternetMaxBandwidthOut: defaultInternetMaxBandwidthOut,
		Amount:                  requests.Integer(strconv.Itoa(hosts.Count)),
		Tag:                     &tags,
		SystemDiskCategory:      rootDiskVolumeType,
		SystemDiskSize:          strconv.Itoa(rootDiskSize),
		DataDisk:                &dataDisks,
		KeyPairName:             keyName,
		InstanceChargeType:      defaultInstanceChargeType,
		SecurityGroupId:         securityGroupID,
		VSwitchId:               VSwitchID,
	}
	var runInstanceResponse *ecs.RunInstancesResponse
	err = retry.Retry(10, 3*time.Second, func() error {
		runInstanceResponse, err = MakeInstances(client, runInstanceRequest)
		if err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("create instance failed: %v", err)
	}
	if err = d.waitInstancesRunning(&runInstanceResponse.InstanceIdSets.InstanceIdSet); err != nil {
		return fmt.Errorf("wait instance running failed: %v", err)
	}

	return nil
}

func rolesToTags(roles []string) (tags []ecs.RunInstancesTag) {
	t := common.TRUELable

	for _, r := range roles {
		tag := ecs.RunInstancesTag{
			Key:   r,
			Value: t,
		}

		tags = append(tags, tag)
	}
	return tags
}

// GetTags get tags
func getTags(hosts *v1.Hosts, infra *v1.Infra) []ecs.RunInstancesTag {
	// Tag name and tag value
	// Set role tag
	tags := rolesToTags(hosts.Roles)
	// Set label tag
	labelKey := common.InfraInstancesLabel
	labelValue := infra.GetInstancesAndVolumesTag()
	uidKey := common.InfraInstancesUUID
	uidValue := string(infra.GetUID())
	tags = append(tags, ecs.RunInstancesTag{
		Key:   labelKey,
		Value: labelValue,
	}, ecs.RunInstancesTag{
		Key:   uidKey,
		Value: uidValue,
	})
	// Set index tag
	indexKey := common.InfraInstancesIndex
	indexValue := strconv.Itoa(hosts.Index)
	tags = append(tags, ecs.RunInstancesTag{
		Key:   indexKey,
		Value: indexValue,
	})
	return tags
}

func getRootDisk(hosts *v1.Hosts) (rootDiskVolumeType string, rootDiskSize int) {
	for _, disk := range hosts.Disks {
		if disk.Type == common.RootVolumeLabel {
			return disk.VolumeType, disk.Capacity
		}
	}
	return defaultRootVolumeType, defaultRootVolumeSize
}

func getDataDisks(host *v1.Hosts) []ecs.RunInstancesDataDisk {
	var dataDisks []ecs.RunInstancesDataDisk
	for _, disk := range host.Disks {
		if disk.Type == common.RootVolumeLabel {
			continue
		}
		dataDisk := ecs.RunInstancesDataDisk{
			Size:     strconv.Itoa(disk.Capacity),
			Category: disk.VolumeType,
		}
		dataDisks = append(dataDisks, dataDisk)
	}
	return dataDisks
}

func getHostName(hosts *v1.Hosts, infra *v1.Infra) string {
	return fmt.Sprintf("%s-%s-%d", infra.Namespace, infra.Name, hosts.Index)
}

func getNetWorkName(infra *v1.Infra) string {
	return fmt.Sprintf("%s-%s", infra.Namespace, infra.Name)
}

func (d Driver) getOrCreateVpc(infra *v1.Infra) (string, error) {
	mutex.Lock()
	defer mutex.Unlock()
	// check vpc exist
	describeVpcsRequest := &ecs.DescribeVpcsRequest{
		RpcRequest: ecs.CreateDescribeVpcsRequest().RpcRequest,
	}
	describeVpcsResponse, err := GetVpcs(d.Client, describeVpcsRequest)
	if err != nil {
		return "", fmt.Errorf("get vpc failed: %v", err)
	}
	netWorkName := getNetWorkName(infra)
	for _, vpc := range describeVpcsResponse.Vpcs.Vpc {
		if vpc.VpcName == netWorkName {
			return vpc.VpcId, nil
		}
	}
	// create vpc
	createVpcRequest := &ecs.CreateVpcRequest{
		RpcRequest: ecs.CreateCreateVpcRequest().RpcRequest,
		CidrBlock:  defaultVpcCidrBlock,
		VpcName:    netWorkName,
	}
	createVpcResponse, err := MakeVPC(d.Client, createVpcRequest)
	if err != nil {
		return "", fmt.Errorf("create vpc failed: %v", err)
	}
	vpcID := createVpcResponse.VpcId
	// create security group
	createSecurityGroupRequest := &ecs.CreateSecurityGroupRequest{
		RpcRequest:        ecs.CreateCreateSecurityGroupRequest().RpcRequest,
		SecurityGroupName: netWorkName,
		Description:       netWorkName,
		VpcId:             vpcID,
	}
	var securityGroupID string
	err = retry.Retry(10, 3*time.Second, func() error {
		securityGroupRequest, err := MakeSecurityGroup(d.Client, createSecurityGroupRequest)
		if err != nil {
			return err
		}
		securityGroupID = securityGroupRequest.SecurityGroupId
		return nil
	})
	if err != nil {
		return "", fmt.Errorf("create security group failed: %v", err)
	}
	authorizeSecurityGroupRequest := &ecs.AuthorizeSecurityGroupRequest{
		RpcRequest:      ecs.CreateAuthorizeSecurityGroupRequest().RpcRequest,
		SecurityGroupId: securityGroupID,
		Permissions: &[]ecs.AuthorizeSecurityGroupPermissions{
			{
				IpProtocol:   defaultIPProtocol,
				PortRange:    defaultPortRange,
				SourceCidrIp: defaultSourceCidrIP,
			},
		},
	}
	_, err = AuthorizeSecurityGroup(d.Client, authorizeSecurityGroupRequest)
	if err != nil {
		return "", fmt.Errorf("authorize security group failed: %v", err)
	}
	// create vswitch
	createVSwitchRequest := &ecs.CreateVSwitchRequest{
		RpcRequest:  ecs.CreateCreateVSwitchRequest().RpcRequest,
		CidrBlock:   defaultVSwitchCidrBlock,
		ZoneId:      infra.Spec.AvailabilityZone,
		VpcId:       vpcID,
		VSwitchName: netWorkName,
	}
	_, err = MakeVSwitch(d.Client, createVSwitchRequest)
	if err != nil {
		return "", fmt.Errorf("create vswitch failed: %v", err)
	}

	return createVpcResponse.VpcId, nil
}

func (d Driver) getSecurityGroup(infra *v1.Infra, vpcID string) (string, error) {
	// check security group exist
	securityGroupName := getNetWorkName(infra)
	describeSecurityGroupsRequest := &ecs.DescribeSecurityGroupsRequest{
		RpcRequest:        ecs.CreateDescribeSecurityGroupsRequest().RpcRequest,
		SecurityGroupName: securityGroupName,
		VpcId:             vpcID,
	}
	describeSecurityGroupsResponse, err := GetSecurityGroups(d.Client, describeSecurityGroupsRequest)
	if err == nil && len(describeSecurityGroupsResponse.SecurityGroups.SecurityGroup) > 0 {
		return describeSecurityGroupsResponse.SecurityGroups.SecurityGroup[0].SecurityGroupId, nil
	}

	return "", fmt.Errorf("get security group failed: %v", err)
}

func (d Driver) getVSwitch(infra *v1.Infra, vpcID string) (string, error) {
	// check vswitch exist
	describeVSwitchesRequest := &ecs.DescribeVSwitchesRequest{
		RpcRequest: ecs.CreateDescribeVSwitchesRequest().RpcRequest,
		VpcId:      vpcID,
	}
	describeVSwitchesResponse, err := GetVSwitches(d.Client, describeVSwitchesRequest)
	if err == nil && len(describeVSwitchesResponse.VSwitches.VSwitch) > 0 {
		return describeVSwitchesResponse.VSwitches.VSwitch[0].VSwitchId, nil
	}
	return "", fmt.Errorf("get vswitch failed: %v", err)
}

func (d Driver) waitInstancesRunning(instanceIDs *[]string) error {
	err := retry.Retry(30, 10*time.Second, func() error {
		describeInstanceStatusRequest := &ecs.DescribeInstanceStatusRequest{
			RpcRequest: ecs.CreateDescribeInstanceStatusRequest().RpcRequest,
			InstanceId: instanceIDs,
		}
		describeInstanceStatusResponse, err := GetInstanceStatus(d.Client, describeInstanceStatusRequest)
		if err != nil {
			return err
		}
		if len(describeInstanceStatusResponse.InstanceStatuses.InstanceStatus) == 0 && len(*instanceIDs) != 0 {
			return fmt.Errorf("get status failed")
		}
		for _, instanceStatus := range describeInstanceStatusResponse.InstanceStatuses.InstanceStatus {
			if instanceStatus.Status != "Running" {
				return fmt.Errorf("instance %s is not running", instanceStatus.InstanceId)
			}
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("retry time out: %v", err)
	}
	return nil
}
