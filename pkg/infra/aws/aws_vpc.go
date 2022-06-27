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

package aws_provider

import (
	"errors"
	"fmt"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/ec2"

	"github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/rand"
)

func (a *AwsProvider) CreateVPC() error {
	if vpcID := VpcID.ClusterValue(a.Infra.Spec); vpcID != "" {
		VpcID.SetValue(a.Infra.Status, vpcID)
		logger.Debug("VpcID using default value")
		return nil
	}
	request := &ec2.CreateVpcInput{}
	//response, err := d.Client.CreateVpc(request)
	response, err := a.EC2Helper.Svc.CreateVpc(request)
	if err != nil {
		return err
	}
	VpcID.SetValue(a.Infra.Status, *response.Vpc.VpcId)
	return nil
}

func (a *AwsProvider) DeleteVPC() error {
	if VpcID.ClusterValue(a.Infra.Spec) != "" && VpcID.Value(a.Infra.Status) != "" {
		return nil
	}
	vpcId := VpcID.Value(a.Infra.Status)
	request := &ec2.DeleteVpcInput{
		VpcId: &vpcId,
	}

	_, err := a.EC2Helper.Svc.DeleteVpc(request)
	if err != nil {
		return err
	}
	return nil
}

//func (a *AwsProvider) CreateVSwitch() error {
//	if vSwitchID := VSwitchID.ClusterValue(a.Infra.Spec); vSwitchID != "" {
//		logger.Debug("VSwitchID using default value")
//		VSwitchID.SetValue(a.Infra.Status, vSwitchID)
//		return nil
//	}
//	request := vpc.CreateCreateVSwitchRequest()
//	request.Scheme = Scheme
//	request.ZoneId = a.Infra.Status.Cluster.ZoneID
//	request.CidrBlock = a.Infra.Spec.Metadata.Instance.Network.PrivateCidrIP
//	request.VpcId = VpcID.Value(a.Infra.Status)
//	request.RegionId = a.Infra.Status.Cluster.RegionID
//	response := vpc.CreateCreateVSwitchResponse()
//	err := a.RetryVpcRequest(request, response)
//	if err != nil {
//		return err
//	}
//	VSwitchID.SetValue(a.Infra.Status, response.VSwitchId)
//
//	return nil
//}

//func (a *AwsProvider) DeleteVSwitch() error {
//	if VSwitchID.ClusterValue(a.Infra.Spec) != "" && VSwitchID.Value(a.Infra.Status) != "" {
//		return nil
//	}
//	request := vpc.CreateDeleteVSwitchRequest()
//	request.Scheme = Scheme
//	request.VSwitchId = VSwitchID.Value(a.Infra.Status)
//
//	response := vpc.CreateDeleteVSwitchResponse()
//	return a.RetryVpcRequest(request, response)
//}

func (a *AwsProvider) CreateSecurityGroup() error {
	if securityGroupID := SecurityGroupID.ClusterValue(a.Infra.Spec); securityGroupID != "" {
		logger.Debug("securityGroupID using default value")
		SecurityGroupID.SetValue(a.Infra.Status, securityGroupID)
		return nil
	}
	request := &ec2.CreateSecurityGroupInput{
		VpcId:     aws.String(VpcID.Value(a.Infra.Status)),
		GroupName: RandSecurityGroup(),
	}
	//request.RegionId = a.Infra.Status.Cluster.RegionID
	response, err := a.EC2Helper.Svc.CreateSecurityGroup(request)
	if err != nil {
		return err
	}

	for _, port := range a.Infra.Spec.Metadata.Instance.Network.ExportPorts {
		if !a.AuthorizeSecurityGroup(*response.GroupId, port) {
			return fmt.Errorf("authorize securitygroup port: %v failed", port)
		}
	}
	SecurityGroupID.SetValue(a.Infra.Status, *response.GroupId)
	return nil
}

func (a *AwsProvider) DeleteSecurityGroup() error {
	if SecurityGroupID.ClusterValue(a.Infra.Spec) != "" && SecurityGroupID.Value(a.Infra.Status) != "" {
		return nil
	}
	request := &ec2.DeleteSecurityGroupInput{
		GroupId: aws.String(SecurityGroupID.Value(a.Infra.Status)),
	}

	_, err := a.EC2Helper.Svc.DeleteSecurityGroup(request)
	if err != nil {
		return err
	}
	return nil
}

func (a *AwsProvider) GetAvailableZoneID() error {
	if a.Infra.Status.Cluster.ZoneID != "" {
		logger.Debug("zoneID using status value")
		return nil
	}
	defer func() {
		logger.Info("get available resource success %s: %s", "GetAvailableZoneID", a.Infra.Status.Cluster.ZoneID)
	}()

	if len(a.Infra.Spec.Metadata.ZoneIDs) != 0 {
		a.Infra.Status.Cluster.ZoneID = a.Infra.Spec.Metadata.ZoneIDs[rand.Rand(len(a.Infra.Spec.Metadata.ZoneIDs))]
		return nil
	}
	request := &ec2.DescribeAvailabilityZonesInput{
		Filters: []*ec2.Filter{
			&ec2.Filter{
				Name:   aws.String("region-name"),
				Values: aws.StringSlice([]string{DefaultRegion}),
			},
		},
	}
	response, err := a.EC2Helper.Svc.DescribeAvailabilityZones(request)
	if err != nil {
		return err
	}
	if len(response.AvailabilityZones) == 0 {
		return errors.New("not available ZoneID ")
	}
	zoneID := response.AvailabilityZones[rand.Rand(len(response.AvailabilityZones))].ZoneId
	a.Infra.Status.Cluster.ZoneID = *zoneID
	return nil
}

func (a *AwsProvider) BindEipForMaster0() error {
	var host *v1beta1.InfraHost
	for _, h := range a.Infra.Status.Hosts {
		if v1beta1.In(v1beta1.Master, h.Roles) && h.Ready {
			host = h.ToHost()
			break
		}
	}
	if host == nil {
		return fmt.Errorf("bind eip for master error: ready master host not fount")
	}
	instances, err := a.GetInstancesInfo(host, JustGetInstanceInfo)
	if err != nil {
		return err
	}
	if len(instances) == 0 {
		return errors.New("can not find master0 ")
	}
	master0 := instances[0]
	eIP, eIPID, err := a.allocateEipAddress()
	if err != nil {
		return err
	}
	err = a.associateEipAddress(master0.InstanceID, eIPID)
	if err != nil {
		return err
	}
	a.Infra.Status.Cluster.EIP = eIP
	EipID.SetValue(a.Infra.Status, eIPID)
	a.Infra.Status.Cluster.Master0ID = master0.InstanceID
	a.Infra.Status.Cluster.Master0InternalIP = master0.PrivateIpAddress
	return nil
}

func (a *AwsProvider) allocateEipAddress() (eIP, eIPID string, err error) {
	request := &ec2.AllocateAddressInput{}
	resp, err := a.EC2Helper.Svc.AllocateAddress(request)
	if err != nil {
		return "", "", err
	}
	return *resp.PublicIp, *resp.AllocationId, nil
}

func (a *AwsProvider) associateEipAddress(instanceID, eipID string) error {
	request := &ec2.AssociateAddressInput{
		InstanceId:   aws.String(instanceID),
		AllocationId: aws.String(eipID),
	}
	response, err := a.EC2Helper.Svc.AssociateAddress(request)
	if err != nil {
		return err
	}
	logger.Info("AssociateEip Suc: %s", response.String())
	return nil
}

func (a *AwsProvider) unAssociateEipAddress() error {
	request := &ec2.DisassociateAddressInput{
		AssociationId: aws.String(EipID.Value(a.Infra.Status)),
	}
	resp, err := a.EC2Helper.Svc.DisassociateAddress(request)
	if err != nil {
		return err
	}
	logger.Info("DisAssociateEip Suc: %s", resp.String())

	return nil
}

func (a *AwsProvider) ReleaseEipAddress() error {
	err := a.unAssociateEipAddress()
	if err != nil {
		return err
	}
	request := &ec2.ReleaseAddressInput{
		AllocationId: aws.String(EipID.Value(a.Infra.Status)),
	}
	response, err := a.EC2Helper.Svc.ReleaseAddress(request)
	if err != nil {
		return err
	}
	logger.Info("Release Ip Suc: %s", response.String())
	return nil
}
