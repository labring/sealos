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

package aws

import (
	"errors"
	"fmt"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/ec2"
	"github.com/docker/docker/pkg/homedir"
	"github.com/labring/sealos/pkg/utils/retry"
	"k8s.io/apimachinery/pkg/util/net"
	"os"
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

func (a *AwsProvider) TryGetInstance(request *ec2.DescribeInstancesInput, instanceInfos *[]*ec2.Instance, expectCount int) error {
	return retry.Retry(TryTimes, TrySleepTime, func() error {
		var err error
		response, err := a.GetInstances(request)
		instanceInfos = &response
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
	tag := make(map[string]string)
	tag[Product] = a.Infra.Name
	tag[Role] = strings.Join(host.Roles, ",")
	tag[Arch] = string(host.Arch)

	instancesTags := CreateDescribeInstancesTag(tag)
	request := &ec2.DescribeInstancesInput{
		Filters: instancesTags,
	}
	ec2s, err := a.EC2Helper.GetInstanceInfos(request)
	if err != nil {
		return nil, err
	}
	for _, i := range ec2s {
		typeInfo, err := a.EC2Helper.GetInstanceType(*i.InstanceType)
		if err != nil {
			logger.Warn("Can't get Instance type %s", *i.InstanceType)
			continue
		}

		publicIp := ""
		if i.PublicIpAddress != nil {
			publicIp = *i.PublicIpAddress
		}
		privateIp := ""
		if i.PrivateIpAddress != nil {
			privateIp = *i.PrivateIpAddress
		}

		instances = append(instances,
			Instance{
				CPU:              (int)(*typeInfo.VCpuInfo.DefaultVCpus),
				Memory:           (int)(*typeInfo.MemoryInfo.SizeInMiB),
				InstanceID:       *i.InstanceId,
				PublicIPAddress:  publicIp,
				PrivateIpAddress: privateIp,
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
		if err != nil {
			return err
		}
	}
	logger.Info("instance len %d, host count %d", len(instances), host.Count)
	if len(instances) < host.Count {
		err = a.RunInstances(host, host.Count-len(instances))
		if err != nil {
			return err
		}
		ipList, err := a.InputIPlist(host)
		if err != nil {
			return err
		}
		status.IPs = strings2.AppendIPList(status.IPs, ipList)
		logger.Info("get scale up IP list %v, append iplist %v, host count %d", ipList, status.IPs, host.Count)
	} else if len(instances) > host.Count {
		var deleteInstancesIDs []string
		var count int
		for _, instance := range instances {
			if instance.InstanceID != a.Infra.Status.Cluster.Master0ID {
				deleteInstancesIDs = append(deleteInstancesIDs, instance.InstanceID)
				count++
			}
			if count == (len(instances) - host.Count) {
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
			logger.Error("272 err %v", err)
			return err
		}
		status.IPs = strings2.ReduceIPList(status.IPs, ipList)
		logger.Info("get scale up IP list %v, reduce iplist %v, host count %d", ipList, status.IPs, host.Count)
	} else {
		logger.Info("get up IP list %v,  host count %d", status.IPs, host.Count)
	}
	for _, instance := range instances {
		if instance.CPU != host.CPU || instance.Memory != host.Memory*1024 {
			logger.Info("instance cpu %d, memory %d, host cpu: %d, memory: %d", instance.CPU, instance.Memory, host.CPU, host.Memory)
			err = a.ChangeInstanceType(instance.InstanceID, host)
			if err != nil {
				logger.Error("282 err %v", err)
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

	for idx := range instanceIDs {
		input := &ec2.TerminateInstancesInput{
			InstanceIds: []*string{
				aws.String(instanceIDs[idx]),
			},
		}
		_, err := a.EC2Helper.Svc.TerminateInstances(input)
		if err != nil {
			return err
		}
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

// RunInstances 用指定的instan规格部署image镜像
func (a *AwsProvider) RunInstances(host *v1beta1.InfraHost, count int) error {
	if host == nil {
		return errors.New("host not set")
	}
	j := a.Infra.Status.FindHostsByRoles(host.Roles)
	if j == -1 {
		return fmt.Errorf("failed to get status, %v", "not find host status,pelase retry")
	}
	var err error
	availableInstanceTypeInfo, err := a.getAvailableInstanceType(host)
	if err != nil {
		return err
	}
	imageID, err := a.getAvailableImageID(host, *availableInstanceTypeInfo.InstanceStorageSupported)
	if err != nil {
		return err
	}
	a.Infra.Status.Hosts[j].ImageID = imageID
	a.Infra.Status.Hosts[j].Arch = host.Arch
	if err != nil {
		return err
	}
	instancesTag := CreateInstanceTag(map[string]string{
		Product: a.Infra.Name,
		Role:    strings.Join(host.Roles, ","),
		Arch:    string(host.Arch),
	})
	err = a.CreateKeyPair()
	if err != nil {
		return err
	}
	input := &ec2.RunInstancesInput{
		ImageId:      aws.String(imageID),
		InstanceType: aws.String(*availableInstanceTypeInfo.InstanceType),
		MaxCount:     aws.Int64(int64(count)),
		MinCount:     aws.Int64(1),
		SecurityGroupIds: []*string{
			aws.String(SecurityGroupID.Value(a.Infra.Status)),
		},
		SubnetId: aws.String(SubnetID.Value(a.Infra.Status)),
		KeyName:  aws.String(KeyPairName),
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
	if a.Infra.Status.Hosts[j].IDs != "" {
		a.Infra.Status.Hosts[j].IDs += "," + instancesIDs
	} else {
		a.Infra.Status.Hosts[j].IDs += instancesIDs
	}
	logger.Info("create instanceIDs %v", instancesIDs)
	return nil
}

func (a *AwsProvider) AuthorizeSecurityGroupIngress(securityGroupID string, exportPorts []v1beta1.InfraExportPort) bool {
	ipPermission := make([]*ec2.IpPermission, 0)
	for idx := range exportPorts {
		exportRule := exportPorts[idx]
		from, to, err := parserPort(exportRule.PortRange)
		if err != nil {
			logger.Error("%v", err)
			return false
		}
		ipPermission = append(ipPermission, &ec2.IpPermission{
			IpProtocol: aws.String(string(exportRule.Protocol)),
			IpRanges: []*ec2.IpRange{
				{
					CidrIp:      aws.String(exportRule.CidrIP),
					Description: aws.String("sealos ingress security group rule"),
				},
			},
			FromPort: aws.Int64(from),
			ToPort:   aws.Int64(to),
		})
	}

	request := &ec2.AuthorizeSecurityGroupIngressInput{
		GroupId:       aws.String(securityGroupID),
		IpPermissions: ipPermission,
	}
	response, err := a.EC2Helper.Svc.AuthorizeSecurityGroupIngress(request)
	if err != nil {
		logger.Error("%v", err)
		return false
	}
	return *response.Return
}

func (a *AwsProvider) AuthorizeSecurityGroup(securityGroupID, cidr string, exportPort v1beta1.InfraExportPort) bool {
	proto := (string)(exportPort.Protocol)
	pr, err := net.ParsePortRange(exportPort.PortRange)
	if err != nil {
		logger.Error(err)
		return false
	}

	request := &ec2.AuthorizeSecurityGroupIngressInput{
		GroupId: aws.String(securityGroupID),
		IpPermissions: []*ec2.IpPermission{
			{
				FromPort:   aws.Int64((int64)(pr.Base)),
				ToPort:     aws.Int64((int64)(pr.Base + pr.Size - 1)),
				IpProtocol: aws.String(proto),
				IpRanges: []*ec2.IpRange{
					{
						CidrIp:      aws.String(cidr),
						Description: aws.String("sealos ip ranges"),
					},
				},
			},
		},
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

// ----------------

// CreateKeyPair 创建key pair
func (a *AwsProvider) CreateKeyPair() (err error) {
	pairs, _ := a.EC2Helper.Svc.DescribeKeyPairs(&ec2.DescribeKeyPairsInput{
		Filters: []*ec2.Filter{
			{
				Name: aws.String("key-name"),
				Values: []*string{
					aws.String(KeyPairName),
				},
			},
		},
	})
	if len(pairs.KeyPairs) > 0 {
		KeyPairID.SetValue(a.Infra.Status, *pairs.KeyPairs[0].KeyPairId)
	}
	if ID := KeyPairID.Value(a.Infra.Status); ID != "" {
		return
	}
	input := &ec2.CreateKeyPairInput{
		KeyName: aws.String(KeyPairName),
	}
	keyPair, err := a.EC2Helper.Svc.CreateKeyPair(input)
	if err != nil {
		return
	}

	logger.Info("p key %s  keyMaterial is %s ", *keyPair.KeyFingerprint, *keyPair.KeyMaterial)
	pkFile := homedir.Get() + "/.sealos.pk"
	f, err := os.Create(pkFile)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = f.WriteString(*keyPair.KeyMaterial)
	if err != nil {
		return err
	}
	if err = f.Sync(); err != nil {
		return err
	}
	KeyPairPath.SetValue(a.Infra.Status, pkFile)

	KeyPairID.SetValue(a.Infra.Status, *keyPair.KeyPairId)
	return
}

// getAvailableInstanceType 获取匹配到的instance type
func (a *AwsProvider) getAvailableInstanceType(host *v1beta1.InfraHost) (*ec2.InstanceTypeInfo, error) {
	instanceTypeInfos, err := a.EC2Helper.FindInstanceTypes(host.CPU, host.Memory, string(host.Arch), "")
	if err != nil {
		return nil, err
	}
	logger.Info("region ID %s", a.Infra.Status.Cluster.RegionID)
	input := &ec2.DescribeInstanceTypeOfferingsInput{
		Filters: []*ec2.Filter{
			{
				Name: aws.String("location"),
				Values: []*string{
					aws.String(a.Infra.Status.Cluster.RegionID),
				},
			},
		},
	}
	offerInstanceTypeMap := make(map[string]bool)
	err = a.EC2Helper.Svc.DescribeInstanceTypeOfferingsPages(input, func(output *ec2.DescribeInstanceTypeOfferingsOutput, lastPage bool) bool {
		for idx := range output.InstanceTypeOfferings {
			offerInstanceTypeMap[*output.InstanceTypeOfferings[idx].InstanceType] = true
		}
		return !lastPage
	})
	logger.Info("offer instance type map %v", offerInstanceTypeMap)
	if err != nil {
		return nil, err
	}
	for idx := range instanceTypeInfos {
		if _, ok := offerInstanceTypeMap[*instanceTypeInfos[idx].InstanceType]; ok {
			return instanceTypeInfos[idx], nil
		}
	}
	return nil, errors.New("not found instanceType")
}

// getAvailableImageID 获取匹配到的imageID
func (a *AwsProvider) getAvailableImageID(host *v1beta1.InfraHost, isInstanceStorageSupported bool) (string, error) {
	archArr := make([]*string, 0)
	s := string(ConvertImageArch(host.Arch))
	archArr = append(archArr, &s)
	deviceType := EBS_ROOT_DEVICE_TYPE
	if isInstanceStorageSupported {
		deviceType = INSTANCE_STORE_ROOT_DEVICE_TYPE
	}
	latestImages, err := a.EC2Helper.GetLatestImages(&deviceType, archArr)
	if err != nil {
		return "", err
	}
	for idx := range latestImages {
		if latestImages[idx].Description == nil {
			continue
		}
		if strings.Contains(strings.ToLower(*latestImages[idx].Description), "docker") ||
			strings.Contains(strings.ToLower(*latestImages[idx].Description), "k8s") {
			continue
		}
		// hardcode: todo only find Canonical Ubuntu ?
		if strings.Contains(strings.ToLower(*latestImages[idx].Description), "canonical") &&
			strings.Contains(strings.ToLower(*latestImages[idx].Description), "22.04") {
			return *latestImages[0].ImageId, nil
		}
	}
	return "", errors.New("not found images")
}

// parserPort j解析rangePort
func parserPort(rangePort string) (int64, int64, error) {
	split := strings.Split(rangePort, "/")
	from, err := strconv.Atoi(split[0])
	if err != nil {
		return 0, 0, err
	}
	to, err := strconv.Atoi(split[1])
	if err != nil {
		return 0, 0, err
	}
	return int64(from), int64(to), nil
}
