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

	v2 "github.com/huaweicloud/huaweicloud-sdk-go-v3/services/vpc/v2"
	"github.com/huaweicloud/huaweicloud-sdk-go-v3/services/vpc/v2/model"
)

func (a *HwProvider) CreateVPC() error {
	if vpcID := VpcID.ClusterValue(a.Infra.Spec); vpcID != "" {
		VpcID.SetValue(a.Infra.Status, vpcID)
		logger.Debug("VpcID using default value")
		return nil
	}
	request := &model.CreateVpcRequest{}
	request.Body = &model.CreateVpcRequestBody{
		Vpc: &model.CreateVpcOption{
			Cidr: &a.Infra.Spec.Metadata.Instance.Network.PrivateCidrIP,
		},
	}
	resp, err := a.RetryVpcRequest(request, v2.GenReqDefForCreateVpc())
	if err != nil {
		return err
	}
	if vpc, ok := resp.(*model.CreateVpcResponse); ok {
		if vpc.HttpStatusCode != 200 || vpc.Vpc == nil {
			return errors.New("not available vpcID ")
		}
		VpcID.SetValue(a.Infra.Status, vpc.Vpc.Id)
	}
	return nil
}

func (a *HwProvider) DeleteVPC() error {
	if VpcID.ClusterValue(a.Infra.Spec) != "" && VpcID.Value(a.Infra.Status) != "" {
		return nil
	}
	request := &model.DeleteVpcRequest{}
	resp, err := a.RetryVpcRequest(request, v2.GenReqDefForDeleteVpc())
	if err != nil {
		return err
	}
	if vpcResp, ok := resp.(*model.DeleteVpcResponse); ok {
		if vpcResp.HttpStatusCode != 200 {
			return errors.New("delete vpc field,return httpCode is not 200")
		}
	}
	return nil
}

//
//func (a *HwProvider) CreateVSwitch() error {
//	if vSwitchID := VSwitchID.ClusterValue(a.Infra.Spec); vSwitchID != "" {
//		logger.Debug("VSwitchID using default value")
//		VSwitchID.SetValue(a.Infra.Status, vSwitchID)
//		return nil
//	}
//	request := vpc.CreateCreateVSwitchRequest()
//	request.Scheme = Scheme
//	request.ZoneId = a.Infra.Status.Metadata.ZoneID
//	request.CidrBlock = CidrBlock
//	request.VpcId = VpcID.Value(a.Infra.Status)
//	request.RegionId = a.Infra.Status.Metadata.RegionID
//	//response, err := d.Client.CreateVSwitch(request)
//	response := vpc.CreateCreateVSwitchResponse()
//	err := a.RetryVpcRequest(request, response)
//	if err != nil {
//		return err
//	}
//	VSwitchID.SetValue(a.Infra.Status, response.VSwitchId)
//
//	return nil
//}
//
//func (a *HwProvider) DeleteVSwitch() error {
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
//
//func (a *HwProvider) CreateSecurityGroup() error {
//	if securityGroupID := SecurityGroupID.ClusterValue(a.Infra.Spec); securityGroupID != "" {
//		logger.Debug("securityGroupID using default value")
//		SecurityGroupID.SetValue(a.Infra.Status, securityGroupID)
//		return nil
//	}
//	request := ecs.CreateCreateSecurityGroupRequest()
//	request.Scheme = Scheme
//	request.RegionId = a.Infra.Status.Metadata.RegionID
//	request.VpcId = VpcID.Value(a.Infra.Status)
//	response := ecs.CreateCreateSecurityGroupResponse()
//	err := a.RetryEcsRequest(request, response)
//	if err != nil {
//		return err
//	}
//
//	if !a.AuthorizeSecurityGroup(response.SecurityGroupId, SSHPortRange) {
//		return fmt.Errorf("authorize securitygroup ssh port failed")
//	}
//	if !a.AuthorizeSecurityGroup(response.SecurityGroupId, APIServerPortRange) {
//		return fmt.Errorf("authorize securitygroup apiserver port failed")
//	}
//	SecurityGroupID.SetValue(a.Infra.Status, response.SecurityGroupId)
//	return nil
//}
//
//func (a *HwProvider) DeleteSecurityGroup() error {
//	if SecurityGroupID.ClusterValue(a.Infra.Spec) != "" && SecurityGroupID.Value(a.Infra.Status) != "" {
//		return nil
//	}
//	request := ecs.CreateDeleteSecurityGroupRequest()
//	request.Scheme = Scheme
//	request.SecurityGroupId = SecurityGroupID.Value(a.Infra.Status)
//
//	response := ecs.CreateDeleteSecurityGroupResponse()
//	return a.RetryEcsRequest(request, response)
//}

//
//func (a *HwProvider) BindEipForMaster0() error {
//	var host *v1beta1.Host
//	for i, h := range a.Infra.Status.Hosts {
//		if strings2.In(v1beta1.Master, h.Roles) && h.Ready {
//			host = &a.Infra.Spec.Hosts[i]
//			break
//		}
//	}
//	if host == nil {
//		return fmt.Errorf("bind eip for master error: ready master host not fount")
//	}
//	instances, err := a.GetInstancesInfo(host, JustGetInstanceInfo)
//	if err != nil {
//		return err
//	}
//	if len(instances) == 0 {
//		return errors.New("can not find master0 ")
//	}
//	master0 := instances[0]
//	eIP, eIPID, err := a.allocateEipAddress()
//	if err != nil {
//		return err
//	}
//	err = a.associateEipAddress(master0.InstanceID, eIPID)
//	if err != nil {
//		return err
//	}
//	a.Infra.Status.Metadata.EIP = eIP
//	EipID.SetValue(a.Infra.Status, eIPID)
//	a.Infra.Status.Metadata.Master0ID = master0.InstanceID
//	a.Infra.Status.Metadata.Master0InternalIP = master0.PrimaryIPAddress
//	return nil
//}
//
//func (a *HwProvider) allocateEipAddress() (eIP, eIPID string, err error) {
//	request := vpc.CreateAllocateEipAddressRequest()
//	request.Scheme = Scheme
//	request.Bandwidth = Bandwidth
//	request.InternetChargeType = InternetChargeType
//	response := vpc.CreateAllocateEipAddressResponse()
//	err = a.RetryVpcRequest(request, response)
//	if err != nil {
//		return "", "", err
//	}
//	return response.EipAddress, response.AllocationId, nil
//}
//
//func (a *HwProvider) associateEipAddress(instanceID, eipID string) error {
//	request := vpc.CreateAssociateEipAddressRequest()
//	request.Scheme = Scheme
//	request.InstanceId = instanceID
//	request.AllocationId = eipID
//
//	response := vpc.CreateAssociateEipAddressResponse()
//	return a.RetryVpcRequest(request, response)
//}
//
//func (a *HwProvider) unAssociateEipAddress() error {
//	request := vpc.CreateUnassociateEipAddressRequest()
//	request.Scheme = Scheme
//	request.AllocationId = EipID.Value(a.Infra.Status)
//	request.Force = requests.NewBoolean(true)
//	response := vpc.CreateUnassociateEipAddressResponse()
//	return a.RetryVpcRequest(request, response)
//}
//
//func (a *HwProvider) ReleaseEipAddress() error {
//	err := a.unAssociateEipAddress()
//	if err != nil {
//		return err
//	}
//	request := vpc.CreateReleaseEipAddressRequest()
//	request.Scheme = Scheme
//	request.AllocationId = EipID.Value(a.Infra.Status)
//	response := vpc.CreateReleaseEipAddressResponse()
//	return a.RetryVpcRequest(request, response)
//}
