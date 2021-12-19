// Copyright © 2021 Alibaba Group Holding Ltd.
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
	"errors"
	"fmt"
	"os"
	"strings"

	v2 "github.com/fanux/sealos/pkg/types/v1beta1"
	"github.com/fanux/sealos/pkg/utils"
	"github.com/fanux/sealos/pkg/utils/logger"

	"github.com/aliyun/alibaba-cloud-sdk-go/sdk/requests"
	"github.com/aliyun/alibaba-cloud-sdk-go/sdk/responses"
	"github.com/aliyun/alibaba-cloud-sdk-go/services/ecs"
)

type Instance struct {
	CPU              int
	Memory           float64
	InstanceID       string
	PrimaryIPAddress string
}

type EcsManager struct {
}

func (a *AliProvider) RetryEcsRequest(request requests.AcsRequest, response responses.AcsResponse) error {
	return a.RetryEcsAction(request, response, TryTimes)
}

func (a *AliProvider) RetryEcsAction(request requests.AcsRequest, response responses.AcsResponse, tryTimes int) error {
	return utils.Retry(tryTimes, TrySleepTime, func() error {
		err := a.EcsClient.DoAction(request, response)
		if err != nil {
			return err
		}
		return nil
	})
}

func (a *AliProvider) RetryEcsInstanceType(request requests.AcsRequest, response responses.AcsResponse, instances []string) error {
	for i := 0; i < len(instances); i++ {
		switch req := request.(type) {
		case *ecs.ModifyInstanceSpecRequest:
			req.InstanceType = instances[i]
		case *ecs.RunInstancesRequest:
			req.InstanceType = instances[i]
		}
		err := a.RetryEcsAction(request, response, 4)
		if err == nil {
			a.Infra.Spec.Instance.Type = instances[i]
			logger.Debug("use SystemInfo type: %s", instances[i])
			break
		} else if i == len(instances)-1 {
			return fmt.Errorf("failed to get ecs SystemInfo type, %v", err)
		}
	}
	return nil
}

func (a *AliProvider) TryGetInstance(request *ecs.DescribeInstancesRequest, response *ecs.DescribeInstancesResponse, expectCount int) error {
	return utils.Retry(TryTimes, TrySleepTime, func() error {
		err := a.EcsClient.DoAction(request, response)
		var ipList []string
		if err != nil {
			return err
		}
		instances := response.Instances.Instance
		if expectCount == -1 {
			return nil
		}

		if len(instances) != expectCount {
			return errors.New("the number of instances is not as expected")
		}
		for _, instance := range instances {
			if instance.NetworkInterfaces.NetworkInterface[0].PrimaryIpAddress == "" {
				return errors.New("PrimaryIpAddress cannt nob be nil")
			}
			if len(ipList) != 0 && !utils.NotIn(instance.NetworkInterfaces.NetworkInterface[0].PrimaryIpAddress, ipList) {
				return errors.New("PrimaryIpAddress cannt nob be same")
			}

			ipList = append(ipList, instance.NetworkInterfaces.NetworkInterface[0].PrimaryIpAddress)
		}

		return nil
	})
}

func (a *AliProvider) InputIPlist(instanceRole string) (ipList []string, err error) {
	var hosts *v2.Hosts
	switch instanceRole {
	case Master:
		hosts = &a.Infra.Spec.Masters
	case Node:
		hosts = a.Infra.Spec.Nodes
	}
	if hosts == nil {
		return nil, err
	}
	instances, err := a.GetInstancesInfo(instanceRole, hosts.Count)
	if err != nil {
		return nil, err
	}
	for _, instance := range instances {
		ipList = append(ipList, instance.PrimaryIPAddress)
	}
	return ipList, nil
}

func (a *AliProvider) GetInstanceStatus(instanceID string) (instanceStatus string, err error) {
	request := ecs.CreateDescribeInstanceStatusRequest()
	request.Scheme = Scheme
	request.InstanceId = &[]string{instanceID}
	response := ecs.CreateDescribeInstanceStatusResponse()
	err = a.RetryEcsRequest(request, response)
	if err != nil {
		return "", fmt.Errorf("get SystemInfo status failed %v , error :%v", instanceID, err)
	}
	if len(response.InstanceStatuses.InstanceStatus) == 0 {
		return "", fmt.Errorf("SystemInfo list is empty")
	}
	return response.InstanceStatuses.InstanceStatus[0].Status, nil
}

func (a *AliProvider) PoweroffInstance(instanceID string) error {
	request := ecs.CreateStopInstancesRequest()
	request.Scheme = Scheme
	request.InstanceId = &[]string{instanceID}

	response := ecs.CreateStopInstancesResponse()
	return a.RetryEcsRequest(request, response)
}

func (a *AliProvider) StartInstance(instanceID string) error {
	request := ecs.CreateStartInstanceRequest()
	request.Scheme = Scheme
	request.InstanceId = instanceID

	response := ecs.CreateStartInstanceResponse()
	return a.RetryEcsRequest(request, response)
}

func (a *AliProvider) ChangeInstanceType(instanceID, instanceRole string, cpu int, memory float64) error {
	instanceStatus, err := a.GetInstanceStatus(instanceID)
	if err != nil {
		return err
	}
	if instanceStatus != Stopped {
		err = a.PoweroffInstance(instanceID)
		if err != nil {
			return err
		}
	}

	expectInstanceType, err := a.GetAvailableResource(instanceRole, cpu, memory)
	if err != nil {
		return err
	}

	request := ecs.CreateModifyInstanceSpecRequest()
	request.Scheme = Scheme
	request.InstanceId = instanceID
	//_, err = d.Client.ModifyInstanceSpec(request)
	response := ecs.CreateModifyInstanceSpecResponse()
	err = a.RetryEcsInstanceType(request, response, expectInstanceType)
	if err != nil {
		return err
	}
	return a.StartInstance(instanceID)
}

func (a *AliProvider) GetInstancesInfo(instancesRole string, expectCount int) (instances []Instance, err error) {
	var count int
	tag := make(map[string]string)
	tag[Product] = a.Infra.Name
	tag[Role] = instancesRole
	if expectCount == 0 {
		count = -1
	} else {
		count = expectCount
	}
	instancesTags := CreateDescribeInstancesTag(tag)
	request := ecs.CreateDescribeInstancesRequest()
	request.Scheme = Scheme
	request.RegionId = a.Infra.Status.RegionID
	request.VSwitchId = a.Infra.Status.VSwitchID
	request.SecurityGroupId = a.Infra.Status.SecurityGroupID
	request.Tag = &instancesTags
	response := ecs.CreateDescribeInstancesResponse()
	err = a.TryGetInstance(request, response, count)
	if err != nil {
		return nil, err
	}

	for _, i := range response.Instances.Instance {
		instances = append(instances,
			Instance{
				CPU:              i.Cpu,
				Memory:           float64(i.Memory / 1024),
				InstanceID:       i.InstanceId,
				PrimaryIPAddress: i.NetworkInterfaces.NetworkInterface[0].PrimaryIpAddress})
	}
	return
}

func (a *AliProvider) ReconcileInstances(instanceRole string) error {
	var hosts *v2.Hosts
	var instances []Instance
	var instancesIDs string
	var IPList []string
	switch instanceRole {
	case Master:
		hosts = &a.Infra.Spec.Masters
		instancesIDs = a.Infra.Status.MasterIDs
		if hosts.Count == 0 {
			return errors.New("master count not set")
		}
	case Node:
		hosts = a.Infra.Spec.Nodes
		instancesIDs = a.Infra.Status.NodeIDs
		if hosts == nil {
			return nil
		}
	}
	if hosts == nil {
		return errors.New("hosts not set")
	}
	var err error
	if instancesIDs != "" {
		instances, err = a.GetInstancesInfo(instanceRole, JustGetInstanceInfo)
	}
	if err != nil {
		return err
	}
	if i := hosts.Count; len(instances) < i {
		err = a.RunInstances(instanceRole, i-len(instances))
		if err != nil {
			return err
		}
		ipList, err := a.InputIPlist(instanceRole)
		if err != nil {
			return err
		}
		IPList = utils.AppendIPList(IPList, ipList)
		logger.Info("get scale up IP list %v, append iplist %v, host count %s", ipList, IPList, hosts.Count)
	}

	for _, instance := range instances {
		if instance.CPU != hosts.CPU || instance.Memory != hosts.Memory {
			err = a.ChangeInstanceType(instance.InstanceID, instanceRole, hosts.CPU, hosts.Memory)
			if err != nil {
				return err
			}
		}
	}
	if instanceRole == Master {
		a.Infra.Status.Masters = IPList
	} else {
		a.Infra.Status.Nodes = IPList
	}
	logger.Info("reconcile %s instances success %v ", instanceRole, IPList)
	return nil
}

func (a *AliProvider) DeleteInstances() error {
	instanceIDs := strings.Split(a.Infra.Status.ShouldBeDeleteInstancesIDs, ",")
	if len(instanceIDs) == 0 {
		return nil
	}
	request := ecs.CreateDeleteInstancesRequest()
	request.Scheme = Scheme
	request.InstanceId = &instanceIDs
	request.Force = requests.NewBoolean(true)
	//_, err := d.Client.DeleteInstances(request)
	response := ecs.CreateDeleteInstancesResponse()
	err := a.RetryEcsRequest(request, response)
	if err != nil {
		return err
	}
	a.Infra.Status.ShouldBeDeleteInstancesIDs = ""
	return nil
}

func CreateDescribeInstancesTag(tags map[string]string) (instanceTags []ecs.DescribeInstancesTag) {
	for k, v := range tags {
		instanceTags = append(instanceTags, ecs.DescribeInstancesTag{Key: k, Value: v})
	}
	return
}

func CreateInstanceDataDisk(dataDisks []string, category string) (instanceDisks []ecs.RunInstancesDataDisk) {
	for _, v := range dataDisks {
		instanceDisks = append(instanceDisks,
			ecs.RunInstancesDataDisk{Size: v, Category: category})
	}
	return
}

type InstanceInfo struct {
	InstanceType string
	ZoneID       string
}

func (a *AliProvider) GetAvailableResourcesForSystem() (instances *InstanceInfo, err error) {
	request := ecs.CreateDescribeAvailableResourceRequest()
	request.Scheme = Scheme
	if a.Infra.Status.ZoneID != "" {
		request.ZoneId = a.Infra.Status.ZoneID
	}
	if a.Infra.Spec.Instance.Type != "" {
		request.InstanceType = a.Infra.Spec.Instance.Type
	}

	request.RegionId = a.Infra.Status.RegionID
	request.DestinationResource = DestinationResource
	request.InstanceChargeType = InstanceChargeType
	request.SystemDiskCategory = a.Infra.Spec.Instance.SystemCategory
	request.DataDiskCategory = a.Infra.Spec.Instance.DataCategory
	request.SpotStrategy = a.Infra.Status.SpotStrategy

	response := ecs.CreateDescribeAvailableResourceResponse()
	err = a.EcsClient.DoAction(request, response)
	if err != nil {
		return nil, err
	}
	if len(response.AvailableZones.AvailableZone) < 1 {
		return nil, fmt.Errorf("resources not find")
	}
	for _, i := range response.AvailableZones.AvailableZone {
		for _, f := range i.AvailableResources.AvailableResource {
			for _, r := range f.SupportedResources.SupportedResource {
				if r.StatusCategory == AvailableTypeStatus {
					return &InstanceInfo{
						InstanceType: r.Value,
						ZoneID:       i.ZoneId,
					}, nil
				}
			}
		}
	}
	return
}
func (a *AliProvider) GetAvailableResource(instanceRole string, cores int, memory float64) (instanceType []string, err error) {
	request := ecs.CreateDescribeAvailableResourceRequest()
	request.Scheme = Scheme
	request.RegionId = a.Infra.Status.RegionID
	request.ZoneId = a.Infra.Status.ZoneID
	request.DestinationResource = DestinationResource
	request.InstanceChargeType = InstanceChargeType
	request.Cores = requests.NewInteger(cores)
	request.Memory = requests.NewFloat(memory)

	response := ecs.CreateDescribeAvailableResourceResponse()
	err = a.EcsClient.DoAction(request, response)
	if err != nil {
		return nil, err
	}
	if len(response.AvailableZones.AvailableZone) < 1 {
		return nil, fmt.Errorf("resources not find")
	}
	for _, i := range response.AvailableZones.AvailableZone {
		for _, f := range i.AvailableResources.AvailableResource {
			for _, r := range f.SupportedResources.SupportedResource {
				if r.StatusCategory == AvailableTypeStatus {
					instanceType = append(instanceType, r.Value)
				}
			}
		}
	}
	var defaultInstanceType []string
	switch instanceRole {
	case Master:
		defaultInstanceType = []string{a.Infra.Status.MasterInstanceType}
	case Node:
		defaultInstanceType = []string{a.Infra.Status.NodeInstanceType}
	}
	instanceType = append(defaultInstanceType, instanceType...)
	return
}

func (a *AliProvider) RunInstances(instanceRole string, count int) error {
	var hosts *v2.Hosts
	switch instanceRole {
	case Master:
		hosts = &a.Infra.Spec.Masters
	case Node:
		hosts = a.Infra.Spec.Nodes
	}
	instances := hosts
	if instances == nil {
		return errors.New("host not set")
	}
	systemDiskSize := instances.Disks.System
	var instanceType []string
	var err error

	instanceType, err = a.GetAvailableResource(instanceRole, instances.CPU, instances.Memory)
	if err != nil {
		return err
	}
	tag := make(map[string]string)
	tag[Product] = a.Infra.Name
	tag[Role] = instanceRole
	instancesTag := CreateInstanceTag(tag)

	dataDisks := instances.Disks.Data
	datadisk := CreateInstanceDataDisk(dataDisks, a.Infra.Spec.Instance.DataCategory)

	request := ecs.CreateRunInstancesRequest()
	request.Scheme = Scheme
	request.ImageId = a.Infra.Spec.Instance.ImageID
	request.Password = a.Infra.Spec.Auth.Passwd
	request.SecurityGroupId = a.Infra.Status.SecurityGroupID
	request.VSwitchId = a.Infra.Status.VSwitchID
	request.SystemDiskSize = systemDiskSize
	request.SystemDiskCategory = a.Infra.Spec.Instance.SystemCategory
	request.DataDisk = &datadisk
	request.SpotStrategy = a.Infra.Status.SpotStrategy
	request.Amount = requests.NewInteger(count)
	request.Tag = &instancesTag
	//response, err := d.Client.RunInstances(request)
	response := ecs.CreateRunInstancesResponse()
	err = a.RetryEcsInstanceType(request, response, instanceType)
	if err != nil {
		return err
	}

	instancesIDs := strings.Join(response.InstanceIdSets.InstanceIdSet, ",")
	switch instanceRole {
	case Master:
		a.Infra.Status.MasterIDs += instancesIDs
	case Node:
		a.Infra.Status.NodeIDs += instancesIDs
	}

	return nil
}

func (a *AliProvider) AuthorizeSecurityGroup(securityGroupID, portRange string) bool {
	request := ecs.CreateAuthorizeSecurityGroupRequest()
	request.Scheme = Scheme
	request.SecurityGroupId = securityGroupID
	request.IpProtocol = IPProtocol
	request.PortRange = portRange
	request.SourceCidrIp = SourceCidrIP
	request.Policy = Policy

	response := ecs.CreateAuthorizeSecurityGroupResponse()
	err := a.RetryEcsRequest(request, response)
	if err != nil {
		logger.Error("%v", err)
		return false
	}
	return response.BaseResponse.IsSuccess()
}

func (a *AliProvider) CreateSecurityGroup() error {
	request := ecs.CreateCreateSecurityGroupRequest()
	request.Scheme = Scheme
	request.RegionId = a.Infra.Status.RegionID
	request.VpcId = a.Infra.Status.VpcID
	response := ecs.CreateCreateSecurityGroupResponse()
	err := a.RetryEcsRequest(request, response)
	if err != nil {
		return err
	}

	if !a.AuthorizeSecurityGroup(response.SecurityGroupId, SSHPortRange) {
		return fmt.Errorf("authorize securitygroup ssh port failed")
	}
	if !a.AuthorizeSecurityGroup(response.SecurityGroupId, APIServerPortRange) {
		return fmt.Errorf("authorize securitygroup apiserver port failed")
	}
	a.Infra.Status.SecurityGroupID = response.SecurityGroupId
	return nil
}

func (a *AliProvider) DeleteSecurityGroup() error {
	request := ecs.CreateDeleteSecurityGroupRequest()
	request.Scheme = Scheme
	request.SecurityGroupId = a.Infra.Status.SecurityGroupID

	response := ecs.CreateDeleteSecurityGroupResponse()
	return a.RetryEcsRequest(request, response)
}

func CreateInstanceTag(tags map[string]string) (instanceTags []ecs.RunInstancesTag) {
	for k, v := range tags {
		instanceTags = append(instanceTags, ecs.RunInstancesTag{Key: k, Value: v})
	}
	return
}

func LoadConfig(config *Config) error {
	config.AccessKey = os.Getenv(EnvAccessKey)
	config.AccessSecret = os.Getenv(EnvAccessSecret)
	config.regionID = os.Getenv(EnvRegion)
	if config.regionID == "" {
		config.regionID = DefaultRegionID
	}
	if config.AccessKey == "" || config.AccessSecret == "" || config.regionID == "" {
		return fmt.Errorf("please set accessKey and accessKeySecret ENV, example: export ACCESSKEYID=xxx export ACCESSKEYSECRET=xxx , how to get AK SK: https://ram.console.aliyun.com/manage/ak")
	}
	return nil
}
