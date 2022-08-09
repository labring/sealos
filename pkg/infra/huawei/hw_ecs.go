// Copyright © 2021 sealos.
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

package huawei

import (
	"errors"

	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/rand"

	v2 "github.com/huaweicloud/huaweicloud-sdk-go-v3/services/ecs/v2"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/services/ecs/v2/model"
)

//type Instance struct {
//	CPU              int
//	Memory           int
//	InstanceID       string
//	PrimaryIPAddress string
//}
//

func (a *HwProvider) GetAvailableZoneID() error {
	if a.Infra.Status.Cluster.ZoneID != "" {
		logger.Debug("zoneID using status value")
		return nil
	}
	defer func() {
		logger.Info("create resource success %s: %s", "GetAvailableZoneID", a.Infra.Status.Cluster.ZoneID)
	}()

	if len(a.Infra.Spec.Metadata.ZoneIDs) != 0 {
		a.Infra.Status.Cluster.ZoneID = a.Infra.Spec.Metadata.ZoneIDs[rand.Rand(len(a.Infra.Spec.Metadata.ZoneIDs))]
		return nil
	}
	resp, err := a.RetryEcsRequest(&model.NovaListAvailabilityZonesRequest{}, v2.GenReqDefForNovaListAvailabilityZones())
	if err != nil {
		return err
	}
	if zones, ok := resp.(*model.NovaListAvailabilityZonesResponse); ok {
		if zones.HttpStatusCode != 200 || zones.AvailabilityZoneInfo == nil || len(*zones.AvailabilityZoneInfo) == 0 {
			return errors.New("not available ZoneID ")
		}
		if zones.AvailabilityZoneInfo != nil {
			zoneID := (*zones.AvailabilityZoneInfo)[rand.Rand(len(*zones.AvailabilityZoneInfo))].ZoneName
			a.Infra.Status.Cluster.ZoneID = zoneID
		}
	}
	return nil
}

//func (a *HwProvider) InputIPlist(host *v1beta1.Host) (ipList []string, err error) {
//	if host == nil {
//		return nil, err
//	}
//	instances, err := a.GetInstancesInfo(host, host.Count)
//	if err != nil {
//		return nil, err
//	}
//	for _, instance := range instances {
//		ipList = append(ipList, instance.PrimaryIPAddress)
//	}
//	return ipList, nil
//}
//
//func (a *HwProvider) GetInstanceStatus(instanceID string) (instanceStatus string, err error) {
//	request := ecs.CreateDescribeInstanceStatusRequest()
//	request.Scheme = Scheme
//	request.InstanceId = &[]string{instanceID}
//	response := ecs.CreateDescribeInstanceStatusResponse()
//	err = a.RetryEcsRequest(request, response)
//	if err != nil {
//		return "", fmt.Errorf("get GetAvailableZoneID status failed %v , error :%v", instanceID, err)
//	}
//	if len(response.InstanceStatuses.InstanceStatus) == 0 {
//		return "", fmt.Errorf("GetAvailableZoneID list is empty")
//	}
//	return response.InstanceStatuses.InstanceStatus[0].Status, nil
//}
//
//func (a *HwProvider) PowerOffInstance(instanceID string) error {
//	request := ecs.CreateStopInstancesRequest()
//	request.Scheme = Scheme
//	request.InstanceId = &[]string{instanceID}
//
//	response := ecs.CreateStopInstancesResponse()
//	return a.RetryEcsRequest(request, response)
//}
//
//func (a *HwProvider) StartInstance(instanceID string) error {
//	request := ecs.CreateStartInstanceRequest()
//	request.Scheme = Scheme
//	request.InstanceId = instanceID
//	response := ecs.CreateStartInstanceResponse()
//	return a.RetryEcsRequest(request, response)
//}
//
//func (a *HwProvider) ChangeInstanceType(instanceID string, host *v1beta1.Host) error {
//	instanceStatus, err := a.GetInstanceStatus(instanceID)
//	if err != nil {
//		return err
//	}
//	if instanceStatus != Stopped {
//		err = a.PowerOffInstance(instanceID)
//		if err != nil {
//			return err
//		}
//	}
//	expectInstanceType, err := a.GetAvailableInstanceType(host)
//	if err != nil {
//		return err
//	}
//
//	request := ecs.CreateModifyInstanceSpecRequest()
//	request.Scheme = Scheme
//	request.InstanceId = instanceID
//	response := ecs.CreateModifyInstanceSpecResponse()
//	err = a.RetryEcsInstanceType(request, response, expectInstanceType, host.Roles)
//	if err != nil {
//		return err
//	}
//	return a.StartInstance(instanceID)
//}
//
//func (a *HwProvider) GetInstancesInfo(host *v1beta1.Host, expectCount int) (instances []Instance, err error) {
//	var count int
//	tag := make(map[string]string)
//	tag[Product] = a.Infra.Name
//	tag[Role] = strings.Join(host.Roles, ",")
//	tag[Arch] = string(host.Arch)
//	if expectCount == 0 {
//		count = -1
//	} else {
//		count = expectCount
//	}
//	instancesTags := CreateDescribeInstancesTag(tag)
//	request := ecs.CreateDescribeInstancesRequest()
//	request.Scheme = Scheme
//	request.RegionId = a.Infra.Status.Metadata.RegionID
//	request.VSwitchId = VSwitchID.Value(a.Infra.Status)
//	request.SecurityGroupId = SecurityGroupID.Value(a.Infra.Status)
//	request.Tag = &instancesTags
//	response := ecs.CreateDescribeInstancesResponse()
//	err = a.TryGetInstance(request, response, count)
//	if err != nil {
//		return nil, err
//	}
//
//	for _, i := range response.Instances.Instance {
//		instances = append(instances,
//			Instance{
//				CPU:              i.Cpu,
//				Memory:           i.Memory / 1024,
//				InstanceID:       i.InstanceId,
//				PrimaryIPAddress: i.NetworkInterfaces.NetworkInterface[0].PrimaryIpAddress})
//	}
//	return
//}
//
//func (a *HwProvider) ReconcileInstances(host *v1beta1.Host, status *v1beta1.HostStatus) error {
//	var instances []Instance
//	var instancesIDs string
//	var IPList []string
//	instancesIDs = status.IDs
//	switch host.ToRole() {
//	case v1beta1.Master:
//		if host.Count == 0 {
//			return errors.New("master count not set")
//		}
//	case v1beta1.Node:
//		if host == nil {
//			return nil
//		}
//	}
//	if host == nil {
//		return errors.New("hosts not set")
//	}
//	var err error
//	if instancesIDs != "" {
//		instances, err = a.GetInstancesInfo(host, JustGetInstanceInfo)
//	}
//	if err != nil {
//		return err
//	}
//	if i := host.Count; len(instances) < i {
//		err = a.RunInstances(host, i-len(instances))
//		if err != nil {
//			return err
//		}
//		ipList, err := a.InputIPlist(host)
//		if err != nil {
//			return err
//		}
//		IPList = utils.AppendIPList(IPList, ipList)
//		logger.Info("get scale up IP list %v, append iplist %v, host count %d", ipList, IPList, host.Count)
//	}
//
//	for _, instance := range instances {
//		if instance.CPU != host.CPU || instance.Memory != host.Memory {
//			err = a.ChangeInstanceType(instance.InstanceID, host)
//			if err != nil {
//				return err
//			}
//		}
//	}
//	status.IPs = IPList
//	logger.Info("reconcile %s instances success %v ", host.String(), IPList)
//	return nil
//}
//
//func (a *HwProvider) DeleteInstances() error {
//	instanceIDs := strings.Split(ShouldBeDeleteInstancesIDs.Value(a.Infra.Status), ",")
//	if len(instanceIDs) == 0 {
//		return nil
//	}
//	request := ecs.CreateDeleteInstancesRequest()
//	request.Scheme = Scheme
//	request.InstanceId = &instanceIDs
//	request.Force = requests.NewBoolean(true)
//	response := ecs.CreateDeleteInstancesResponse()
//	err := a.RetryEcsRequest(request, response)
//	if err != nil {
//		return err
//	}
//	ShouldBeDeleteInstancesIDs.SetValue(a.Infra.Status, "")
//	if strings2.In(a.Infra.Status.Metadata.Master0ID, instanceIDs) {
//		logger.Debug("delete instance success,need delete about instance info[master0id,master0InternalIP,eip,eipID]")
//		a.Infra.Status.Metadata.Master0ID = ""
//		a.Infra.Status.Metadata.Master0InternalIP = ""
//		a.Infra.Status.Metadata.EIP = ""
//		delete(a.Infra.Status.Metadata.Annotations, string(EipID))
//	}
//	return nil
//}
//
//func CreateDescribeInstancesTag(tags map[string]string) (instanceTags []ecs.DescribeInstancesTag) {
//	for k, v := range tags {
//		instanceTags = append(instanceTags, ecs.DescribeInstancesTag{Key: k, Value: v})
//	}
//	return
//}
//
//func CreateInstanceDataDisk(dataDisks []v1beta1.Disk, category string) (instanceDisks []ecs.RunInstancesDataDisk) {
//	for _, v := range dataDisks {
//		instanceDisks = append(instanceDisks,
//			ecs.RunInstancesDataDisk{Size: strconv.Itoa(v.Capacity), Category: category})
//	}
//	return
//}
//
//func (a *HwProvider) RunInstances(host *v1beta1.Host, count int) error {
//	if host == nil {
//		return errors.New("host not set")
//	}
//	j := a.Infra.Status.FindHostsByRoles(host.Roles)
//	if j == -1 {
//		return fmt.Errorf("failed to get status, %v", "not find host status,pelase retry")
//	}
//	systemDiskSize := host.Disks[0]
//	var instanceType []string
//	var err error
//	var imageID string
//	if imageID, err = a.GetAvailableImageID(host); err != nil {
//		return err
//	}
//	a.Infra.Status.Hosts[j].ImageID = imageID
//	a.Infra.Status.Hosts[j].Arch = host.Arch
//	instanceType, err = a.GetAvailableInstanceType(host)
//	if err != nil {
//		return err
//	}
//	tag := make(map[string]string)
//	tag[Product] = a.Infra.Name
//	tag[Role] = strings.Join(host.Roles, ",")
//	tag[Arch] = string(host.Arch)
//	instancesTag := CreateInstanceTag(tag)
//
//	dataDisks := host.Disks[1:]
//	datadisk := CreateInstanceDataDisk(dataDisks, a.Infra.Status.Hosts[j].DataCategory)
//
//	request := ecs.CreateRunInstancesRequest()
//	request.Scheme = Scheme
//	request.ImageId = imageID
//
//	request.Password = a.Infra.Spec.Metadata.AccessChannels.sshInterface.Passwd
//	request.SecurityGroupId = SecurityGroupID.Value(a.Infra.Status)
//	request.VSwitchId = VSwitchID.Value(a.Infra.Status)
//	request.SystemDiskSize = strconv.Itoa(systemDiskSize.Capacity)
//	request.SystemDiskCategory = a.Infra.Status.Hosts[j].SystemCategory
//	request.DataDisk = &datadisk
//	request.SpotStrategy = a.Infra.Status.Metadata.SpotStrategy
//	request.Amount = requests.NewInteger(count)
//	request.Tag = &instancesTag
//	response := ecs.CreateRunInstancesResponse()
//	err = a.RetryEcsInstanceType(request, response, instanceType, host.Roles)
//	if err != nil {
//		return err
//	}
//
//	instancesIDs := strings.Join(response.InstanceIdSets.InstanceIdSet, ",")
//	a.Infra.Status.Hosts[j].IDs += instancesIDs
//	return nil
//}
//
//func (a *HwProvider) AuthorizeSecurityGroup(securityGroupID, portRange string) bool {
//	request := ecs.CreateAuthorizeSecurityGroupRequest()
//	request.Scheme = Scheme
//	request.SecurityGroupId = securityGroupID
//	request.IpProtocol = IPProtocol
//	request.PortRange = portRange
//	request.SourceCidrIp = SourceCidrIP
//	request.Policy = Policy
//
//	response := ecs.CreateAuthorizeSecurityGroupResponse()
//	err := a.RetryEcsRequest(request, response)
//	if err != nil {
//		logger.Error("%v", err)
//		return false
//	}
//	return response.BaseResponse.IsSuccess()
//}
//func CreateInstanceTag(tags map[string]string) (instanceTags []ecs.RunInstancesTag) {
//	for k, v := range tags {
//		instanceTags = append(instanceTags, ecs.RunInstancesTag{Key: k, Value: v})
//	}
//	return
//}
