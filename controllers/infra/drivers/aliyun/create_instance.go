// Copyright © 2023 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package aliyun

import (
	"encoding/json"
	"fmt"
	"strconv"
	"sync"
	"time"

	"github.com/aliyun/alibaba-cloud-sdk-go/services/vpc"

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
	CreateSecurityGroup(request *ecs.CreateSecurityGroupRequest) (response *ecs.CreateSecurityGroupResponse, err error)
	DescribeSecurityGroups(request *ecs.DescribeSecurityGroupsRequest) (response *ecs.DescribeSecurityGroupsResponse, err error)
	AuthorizeSecurityGroup(request *ecs.AuthorizeSecurityGroupRequest) (response *ecs.AuthorizeSecurityGroupResponse, err error)
}

type VPCCreateAPI interface {
	CreateVpc(request *vpc.CreateVpcRequest) (response *vpc.CreateVpcResponse, err error)
	CreateVSwitch(request *vpc.CreateVSwitchRequest) (response *vpc.CreateVSwitchResponse, err error)
	DescribeVpcs(request *vpc.DescribeVpcsRequest) (response *vpc.DescribeVpcsResponse, err error)
	DescribeVSwitches(request *vpc.DescribeVSwitchesRequest) (response *vpc.DescribeVSwitchesResponse, err error)
}

func MakeInstances(api ECSCreateInstancesAPI, request *ecs.RunInstancesRequest) (*ecs.RunInstancesResponse, error) {
	return api.RunInstances(request)
}

func MakeTags(api ECSCreateInstancesAPI, request *ecs.TagResourcesRequest) (*ecs.TagResourcesResponse, error) {
	return api.TagResources(request)
}

func MakeVSwitch(api VPCCreateAPI, request *vpc.CreateVSwitchRequest) (*vpc.CreateVSwitchResponse, error) {
	return api.CreateVSwitch(request)
}

func MakeVPC(api VPCCreateAPI, request *vpc.CreateVpcRequest) (*vpc.CreateVpcResponse, error) {
	return api.CreateVpc(request)
}

func MakeSecurityGroup(api ECSCreateInstancesAPI, request *ecs.CreateSecurityGroupRequest) (*ecs.CreateSecurityGroupResponse, error) {
	return api.CreateSecurityGroup(request)
}

func GetVpcs(api VPCCreateAPI, request *vpc.DescribeVpcsRequest) (*vpc.DescribeVpcsResponse, error) {
	return api.DescribeVpcs(request)
}

func GetVSwitches(api VPCCreateAPI, request *vpc.DescribeVSwitchesRequest) (*vpc.DescribeVSwitchesResponse, error) {
	return api.DescribeVSwitches(request)
}

func GetSecurityGroups(api ECSCreateInstancesAPI, request *ecs.DescribeSecurityGroupsRequest) (*ecs.DescribeSecurityGroupsResponse, error) {
	return api.DescribeSecurityGroups(request)
}

func AuthorizeSecurityGroup(api ECSCreateInstancesAPI, request *ecs.AuthorizeSecurityGroupRequest) (*ecs.AuthorizeSecurityGroupResponse, error) {
	return api.AuthorizeSecurityGroup(request)
}

func (d Driver) createInstances(hosts *v1.Hosts, infra *v1.Infra) error {
	client := d.ECSClient
	if hosts.Count == 0 {
		return nil
	}
	tags := getTags(hosts, infra)
	keyName := infra.Spec.SSH.PkName
	if infra.Spec.AvailabilityZone == "" {
		infra.Spec.AvailabilityZone = defaultAvailabilityZone
	}
	// get or create vpc
	vpcID, err := d.getOrCreateVpc(infra)
	if err != nil {
		return fmt.Errorf("failed to get or create vpc, %v", err)
	}

	// get or create security group
	securityGroupID, err := d.getOrCreateSecurityGroup(infra, vpcID)
	if err != nil {
		return fmt.Errorf("failed to get or create security group, %v", err)
	}

	// get or create vswitch
	VSwitchID, err := d.getOrCreateVSwitch(infra, vpcID)
	if err != nil {
		return fmt.Errorf("failed to get or create vswitch, %v", err)
	}

	// get root disk
	rootDiskVolumeType, rootDiskSize := getRootDisk(hosts)
	// get data disk
	dataDisks := getDataDisks(hosts)
	// get host name
	hostName := getHostName(infra)

	// create instance
	runInstanceRequest := &ecs.RunInstancesRequest{
		RpcRequest:              ecs.CreateRunInstancesRequest().RpcRequest,
		ZoneId:                  infra.Spec.AvailabilityZone,
		ResourceGroupId:         d.ResourceGroupID,
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

// getHostName Ensure unique hostname, according: https://help.aliyun.com/document_detail/63440.html
func getHostName(infra *v1.Infra) string {
	return fmt.Sprintf("%s-${instance_id}", infra.Name)
}

func getNetWorkName(infra *v1.Infra) string {
	return fmt.Sprintf("%s-%s", infra.Namespace, infra.Name)
}

func (d Driver) getOrCreateVpc(infra *v1.Infra) (string, error) {
	mutex.Lock()
	defer mutex.Unlock()
	//TODO: allow custom configuration of vpc/security group/vswitch

	// check vpc exist
	describeVpcsRequest := &vpc.DescribeVpcsRequest{
		RpcRequest:      vpc.CreateDescribeVpcsRequest().RpcRequest,
		ResourceGroupId: d.ResourceGroupID,
	}
	describeVpcsResponse, err := GetVpcs(d.VPCClient, describeVpcsRequest)
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
	createVpcRequest := &vpc.CreateVpcRequest{
		RpcRequest:      vpc.CreateCreateVpcRequest().RpcRequest,
		CidrBlock:       defaultVpcCidrBlock,
		VpcName:         netWorkName,
		ResourceGroupId: d.ResourceGroupID,
	}
	createVpcResponse, err := MakeVPC(d.VPCClient, createVpcRequest)
	if err != nil {
		return "", fmt.Errorf("create vpc failed: %v", err)
	}
	return createVpcResponse.VpcId, nil
}

func (d Driver) getOrCreateSecurityGroup(infra *v1.Infra, vpcID string) (string, error) {
	mutex.Lock()
	defer mutex.Unlock()
	// check security group exist
	securityGroupName := getNetWorkName(infra)
	describeSecurityGroupsRequest := &ecs.DescribeSecurityGroupsRequest{
		RpcRequest:        ecs.CreateDescribeSecurityGroupsRequest().RpcRequest,
		SecurityGroupName: securityGroupName,
		VpcId:             vpcID,
		ResourceGroupId:   d.ResourceGroupID,
	}
	describeSecurityGroupsResponse, err := GetSecurityGroups(d.ECSClient, describeSecurityGroupsRequest)
	if err == nil && len(describeSecurityGroupsResponse.SecurityGroups.SecurityGroup) > 0 {
		return describeSecurityGroupsResponse.SecurityGroups.SecurityGroup[0].SecurityGroupId, nil
	}
	// if not exist, create security group
	createSecurityGroupRequest := &ecs.CreateSecurityGroupRequest{
		RpcRequest:        ecs.CreateCreateSecurityGroupRequest().RpcRequest,
		SecurityGroupName: securityGroupName,
		Description:       securityGroupName,
		VpcId:             vpcID,
		ResourceGroupId:   d.ResourceGroupID,
	}
	var securityGroupID string
	err = retry.Retry(10, 3*time.Second, func() error {
		securityGroupResponse, err := MakeSecurityGroup(d.ECSClient, createSecurityGroupRequest)
		if err != nil {
			return err
		}
		securityGroupID = securityGroupResponse.SecurityGroupId
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
	_, err = AuthorizeSecurityGroup(d.ECSClient, authorizeSecurityGroupRequest)
	if err != nil {
		return "", fmt.Errorf("authorize security group failed: %v", err)
	}
	return securityGroupID, nil
}

func (d Driver) getOrCreateVSwitch(infra *v1.Infra, vpcID string) (string, error) {
	mutex.Lock()
	defer mutex.Unlock()
	// check vswitch exist
	describeVSwitchesRequest := &vpc.DescribeVSwitchesRequest{
		RpcRequest: vpc.CreateDescribeVSwitchesRequest().RpcRequest,
		VpcId:      vpcID,
	}
	describeVSwitchesResponse, err := GetVSwitches(d.VPCClient, describeVSwitchesRequest)
	if err == nil && len(describeVSwitchesResponse.VSwitches.VSwitch) > 0 {
		return describeVSwitchesResponse.VSwitches.VSwitch[0].VSwitchId, nil
	}
	// create vswitch
	vswitchName := getNetWorkName(infra)
	createVSwitchRequest := &vpc.CreateVSwitchRequest{
		RpcRequest:  vpc.CreateCreateVSwitchRequest().RpcRequest,
		CidrBlock:   defaultVSwitchCidrBlock,
		ZoneId:      infra.Spec.AvailabilityZone,
		VpcId:       vpcID,
		VSwitchName: vswitchName,
	}
	var createVSwitchResponse *vpc.CreateVSwitchResponse
	createVSwitchResponse, err = MakeVSwitch(d.VPCClient, createVSwitchRequest)
	if err != nil {
		return "", fmt.Errorf("create vswitch failed: %v", err)
	}
	return createVSwitchResponse.VSwitchId, nil
}

func (d Driver) waitInstancesRunning(instanceIDs *[]string) error {
	err := retry.Retry(30, 10*time.Second, func() error {
		inputIDs, _ := json.Marshal(*instanceIDs)
		describeInstancesRequest := &ecs.DescribeInstancesRequest{
			RpcRequest: ecs.CreateDescribeInstancesRequest().RpcRequest,
			// ["i-bp67acfmxazb4p****", "i-bp67acfmxazb4p****", … "i-bp67acfmxazb4p****"]
			InstanceIds:     string(inputIDs),
			ResourceGroupId: d.ResourceGroupID,
		}
		describeInstancesResponse, err := GetInstances(d.ECSClient, describeInstancesRequest)
		if err != nil {
			return err
		}
		if len(describeInstancesResponse.Instances.Instance) == 0 && len(*instanceIDs) != 0 {
			return fmt.Errorf("get status failed")
		}
		for _, instance := range describeInstancesResponse.Instances.Instance {
			if instance.Status != "Running" {
				return fmt.Errorf("instance %s is not running, current status: %s", instance.InstanceId, instance.Status)
			}
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("retry time out: %v", err)
	}
	return nil
}
