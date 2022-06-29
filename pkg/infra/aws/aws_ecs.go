// Copyright © 2021 Awsbaba Group Holding Ltd.
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

package aws_provider

import (
	"errors"
	"fmt"
	"github.com/aliyun/alibaba-cloud-sdk-go/services/ecs"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/ec2"
	"github.com/labring/sealos/pkg/utils/retry"
	"k8s.io/apimachinery/pkg/util/net"
	"strconv"
	"strings"

	"github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/logger"
	strings2 "github.com/labring/sealos/pkg/utils/strings"
)

type Instance struct {
	CPU              int
	Memory           int
	InstanceID       string
	PublicIPAddress  string
	PrivateIpAddress string
}

func (a *AwsProvider) InputIPlist(host *v1beta1.InfraHost) (ipList []string, err error) {
	if host == nil {
		return nil, err
	}
	instances, err := a.GetInstancesInfo(host, host.Count)
	if err != nil {
		return nil, err
	}
	for _, instance := range instances {
		ipList = append(ipList, instance.PrivateIpAddress)
	}
	return ipList, nil
}

// Get the reservations based on the input, with all pages concatenated
func (a *AwsProvider) GetInstances(input *ec2.DescribeInstancesInput) ([]*ec2.Instance, error) {
	allReservations := []*ec2.Reservation{}

	err := a.EC2Helper.Svc.DescribeInstancesPages(input, func(page *ec2.DescribeInstancesOutput, lastPage bool) bool {
		allReservations = append(allReservations, page.Reservations...)
		return !lastPage
	})

	allInstances := []*ec2.Instance{}
	for _, reservation := range allReservations {
		for _, instance := range reservation.Instances {
			allInstances = append(allInstances, instance)
		}
	}

	return allInstances, err
}

func (a *AwsProvider) GetInstanceStatus(instanceID string) (instanceStatus string, err error) {
	input := &ec2.DescribeInstancesInput{
		InstanceIds: aws.StringSlice([]string{
			instanceID,
		}),
	}

	instances, err := a.GetInstances(input)
	if err != nil {
		return "", err
	}
	if len(instances) <= 0 {
		return "", errors.New("No instance found")
	}

	return instances[0].State.String(), nil
}

func (a *AwsProvider) PowerOffInstance(instanceID string) error {
	var inss = []string{instanceID}
	// Get instance id
	input := &ec2.StopInstancesInput{
		InstanceIds: aws.StringSlice(inss),
	}

	fmt.Println("Stopping instances")

	_, err := a.EC2Helper.Svc.StopInstances(input)
	if err != nil {
		return err
	}

	fmt.Println(fmt.Sprintf("Instance %s terminated successfully", instanceID))

	return nil
}

func (a *AwsProvider) StartInstance(instanceID string) error {
	var inss = []string{instanceID}

	request := &ec2.StartInstancesInput{
		InstanceIds: aws.StringSlice(inss),
	}
	fmt.Println("Starting instances")

	_, err := a.EC2Helper.Svc.StartInstances(request)
	if err != nil {
		return err
	}

	return nil
}

func (a *AwsProvider) ChangeInstanceType(instanceID string, host *v1beta1.InfraHost) error {
	instanceStatus, err := a.GetInstanceStatus(instanceID)
	if err != nil {
		return err
	}
	if strings.ToLower(instanceStatus) != "stopped" {
		err = a.PowerOffInstance(instanceID)
		if err != nil {
			return err
		}
	}
	expectInstanceType, err := a.GetAvailableInstanceType(host)
	if err != nil {
		return err
	}

	request := &ec2.ModifyInstanceAttributeInput{InstanceType: &ec2.AttributeValue{
		Value: aws.String(expectInstanceType[0]),
	}}
	request.InstanceId = &instanceID

	_, err = a.EC2Helper.Svc.ModifyInstanceAttribute(request)
	if err != nil {
		return err
	}

	return a.StartInstance(instanceID)
}

func (a *AwsProvider) TryGetInstance(request *ec2.DescribeInstancesInput, response []*ec2.Instance, expectCount int) error {
	return retry.Retry(TryTimes, TrySleepTime, func() error {
		var err error
		response, err = a.GetInstances(request)

		var ipList []string
		if err != nil {
			return err
		}
		instances := response
		if expectCount == -1 {
			return nil
		}

		if len(instances) != expectCount {
			return errors.New("the number of instances is not as expected")
		}
		for _, instance := range instances {
			if *instance.PrivateIpAddress == "" {
				return errors.New("PrimaryIpAddress cannt nob be nil")
			}
			if len(ipList) != 0 && !strings2.NotIn(*instance.PrivateIpAddress, ipList) {
				return errors.New("PrimaryIpAddress cannt nob be same")
			}

			ipList = append(ipList, *instance.PrivateIpAddress)
		}

		return nil
	})
}

func (a *AwsProvider) GetInstancesInfo(host *v1beta1.InfraHost, expectCount int) (instances []Instance, err error) {
	var count int
	tag := make(map[string]string)
	tag[Product] = a.Infra.Name
	tag[Role] = strings.Join(host.Roles, ",")
	tag[Arch] = string(host.Arch)
	if expectCount == 0 {
		count = -1
	} else {
		count = expectCount
	}
	instancesTags := CreateDescribeInstancesTag(tag)
	request := &ec2.DescribeInstancesInput{
		Filters: instancesTags,
	}

	var ec2s []*ec2.Instance

	err = a.TryGetInstance(request, ec2s, count)
	if err != nil {
		return nil, err
	}

	for _, i := range ec2s {
		type_info, err := a.EC2Helper.GetInstanceType(*i.InstanceType)
		if err != nil {
			logger.Warn("Can't get Instance type %s", *i.InstanceType)
			continue
		}
		instances = append(instances,
			Instance{
				CPU:              (int)(*type_info.VCpuInfo.DefaultVCpus),
				Memory:           (int)(*type_info.MemoryInfo.SizeInMiB),
				InstanceID:       *i.InstanceId,
				PublicIPAddress:  *i.PublicIpAddress,
				PrivateIpAddress: *i.PrivateIpAddress,
			})
	}
	return
}

func (a *AwsProvider) ReconcileInstances(host *v1beta1.InfraHost, status *v1beta1.InfraHostStatus) error {
	var instances []Instance
	switch host.ToRole() {
	case v1beta1.Master:
		if host.Count == 0 {
			return errors.New("master count not set")
		}
	case v1beta1.Node:
		if host == nil {
			return nil
		}
	}
	if host == nil {
		return errors.New("hosts not set")
	}
	var err error
	if status.IDs != "" {
		instances, err = a.GetInstancesInfo(host, JustGetInstanceInfo)
	}
	if err != nil {
		return err
	}
	if i := host.Count; len(instances) < i {
		err = a.RunInstances(host, i-len(instances))
		if err != nil {
			return err
		}
		ipList, err := a.InputIPlist(host)
		if err != nil {
			return err
		}
		status.IPs = strings2.AppendIPList(status.IPs, ipList)
		logger.Info("get scale up IP list %v, append iplist %v, host count %d", ipList, status.IPs, host.Count)
	} else if len(instances) > i {
		var deleteInstancesIDs []string
		var count int
		for _, instance := range instances {
			if instance.InstanceID != a.Infra.Status.Cluster.Master0ID {
				deleteInstancesIDs = append(deleteInstancesIDs, instance.InstanceID)
				count++
			}
			if count == (len(instances) - i) {
				break
			}
		}
		if len(deleteInstancesIDs) != 0 {
			ShouldBeDeleteInstancesIDs.SetValue(a.Infra.Status, strings.Join(deleteInstancesIDs, ","))
			err = a.DeleteInstances()
			if err != nil {
				return err
			}
			ShouldBeDeleteInstancesIDs.SetValue(a.Infra.Status, "")
		}
		ipList, err := a.InputIPlist(host)
		if err != nil {
			return err
		}
		status.IPs = strings2.ReduceIPList(status.IPs, ipList)
		logger.Info("get scale up IP list %v, reduce iplist %v, host count %d", ipList, status.IPs, host.Count)
	} else {
		logger.Info("get up IP list %v,  host count %d", status.IPs, host.Count)
	}
	for _, instance := range instances {
		if instance.CPU != host.CPU || instance.Memory != host.Memory {
			err = a.ChangeInstanceType(instance.InstanceID, host)
			if err != nil {
				return err
			}
		}
	}
	logger.Info("reconcile %s instances success %v ", host.String(), status.IPs)
	return nil
}

func (a *AwsProvider) DeleteInstances() error {
	instanceIDs := strings.Split(ShouldBeDeleteInstancesIDs.Value(a.Infra.Status), ",")
	if len(instanceIDs) == 0 {
		return nil
	}
	request := &ec2.TerminateInstancesInput{}
	var ids []*string
	for _, id := range instanceIDs {
		ids = append(ids, &id)
	}
	request.InstanceIds = ids
	_, err := a.EC2Helper.Svc.TerminateInstances(request)
	if err != nil {
		return err
	}
	ShouldBeDeleteInstancesIDs.SetValue(a.Infra.Status, "")
	if v1beta1.In(a.Infra.Status.Cluster.Master0ID, instanceIDs) {
		logger.Debug("delete instance success,need delete about instance info[master0id,master0InternAwsP,eip,eipID]")
		a.Infra.Status.Cluster.Master0ID = ""
		a.Infra.Status.Cluster.Master0InternalIP = ""
		a.Infra.Status.Cluster.EIP = ""
		delete(a.Infra.Status.Cluster.Annotations, string(EipID))
	}
	return nil
}

func CreateDescribeInstancesTag(tags map[string]string) (instanceTags []*ec2.Filter) {
	for k, v := range tags {
		// tag:<key> in filter
		k = "tag:" + k
		instanceTags = append(instanceTags, &ec2.Filter{Name: aws.String(k), Values: aws.StringSlice([]string{v})})
	}
	return
}

func CreateInstanceDataDisk(dataDisks []v1beta1.InfraDisk, category string) (instanceDisks []ecs.RunInstancesDataDisk) {
	for _, v := range dataDisks {
		instanceDisks = append(instanceDisks,
			ecs.RunInstancesDataDisk{Size: strconv.Itoa(v.Capacity), Category: category})
	}
	return
}

func (a *AwsProvider) RunInstances(host *v1beta1.InfraHost, count int) error {
	if host == nil {
		return errors.New("host not set")
	}
	j := a.Infra.Status.FindHostsByRoles(host.Roles)
	if j == -1 {
		return fmt.Errorf("failed to get status, %v", "not find host status,pelase retry")
	}
	systemDiskSize := host.Disks[0]
	var instanceType []string
	var err error
	var imageID string
	if imageID, err = a.GetAvailableImageID(host); err != nil {
		return err
	}
	a.Infra.Status.Hosts[j].ImageID = imageID
	a.Infra.Status.Hosts[j].Arch = host.Arch
	instanceType, err = a.GetAvailableInstanceType(host)
	if err != nil {
		return err
	}
	tag := make(map[string]string)
	tag[Product] = a.Infra.Name
	tag[Role] = strings.Join(host.Roles, ",")
	tag[Arch] = string(host.Arch)
	instancesTag := CreateInstanceTag(tag)

	// dataDisks := host.Disks[1:]

	//datadisk := CreateInstanceDataDisk(dataDisks, a.Infra.Status.Hosts[j].DataCategory)

	input := &ec2.RunInstancesInput{
		BlockDeviceMappings: []*ec2.BlockDeviceMapping{
			{
				DeviceName: aws.String("/dev/sda"),
				Ebs: &ec2.EbsBlockDevice{
					VolumeSize: aws.Int64(int64(systemDiskSize.Capacity)),
				},
			},
		},
		ImageId:      aws.String(imageID),
		InstanceType: aws.String(instanceType[0]),
		MaxCount:     aws.Int64(1),
		SecurityGroupIds: []*string{
			aws.String(SecurityGroupID.Value(a.Infra.Status)),
		},
		TagSpecifications: []*ec2.TagSpecification{
			{
				ResourceType: aws.String("instance"),
				Tags:         instancesTag,
			},
		},
	}
	instances, err := a.RetryEcsInstanceType(input)
	if err != nil {
		return err
	}
	var ids []string
	for idx := range instances {
		ids = append(ids, *instances[idx].InstanceId)
	}
	instancesIDs := strings.Join(ids, ",")
	a.Infra.Status.Hosts[j].IDs += instancesIDs
	return nil
}

func (a *AwsProvider) AuthorizeSecurityGroup(securityGroupID string, exportPort v1beta1.InfraExportPort) bool {
	proto := (string)(exportPort.Protocol)
	pr, err := net.ParsePortRange(exportPort.PortRange)
	if err != nil {
		logger.Error(err)
		return false
	}

	request := &ec2.AuthorizeSecurityGroupIngressInput{
		FromPort:   aws.Int64((int64)(pr.Base)),
		ToPort:     aws.Int64((int64)(pr.Base + pr.Size - 1)),
		CidrIp:     aws.String(exportPort.CidrIP),
		IpProtocol: aws.String(proto),
		GroupId:    aws.String(securityGroupID),
	}

	response, err := a.EC2Helper.Svc.AuthorizeSecurityGroupIngress(request)
	if err != nil {
		logger.Error("%v", err)
		return false
	}
	return *response.Return
}
func CreateInstanceTag(tags map[string]string) (instanceTags []*ec2.Tag) {
	for k, v := range tags {
		instanceTags = append(instanceTags, &ec2.Tag{Key: aws.String(k), Value: aws.String(v)})
	}
	return
}
