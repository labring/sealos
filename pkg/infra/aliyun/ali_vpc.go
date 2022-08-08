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

	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/rand"
	strings2 "github.com/labring/sealos/pkg/utils/strings"

	"github.com/aliyun/alibaba-cloud-sdk-go/sdk/requests"
	"github.com/aliyun/alibaba-cloud-sdk-go/services/ecs"
	"github.com/aliyun/alibaba-cloud-sdk-go/services/vpc"

	"github.com/labring/sealos/pkg/types/v1beta1"
)

func (a *AliProvider) CreateVPC() error {
	if vpcID := VpcID.ClusterValue(a.Infra.Spec); vpcID != "" {
		VpcID.SetValue(a.Infra.Status, vpcID)
		logger.Debug("VpcID using default value")
		return nil
	}
	request := vpc.CreateCreateVpcRequest()
	request.Scheme = Scheme
	request.RegionId = a.Infra.Status.Cluster.RegionID
	//response, err := d.Client.CreateVpc(request)
	response := vpc.CreateCreateVpcResponse()
	err := a.RetryVpcRequest(request, response)
	if err != nil {
		return err
	}
	VpcID.SetValue(a.Infra.Status, response.VpcId)
	return nil
}

func (a *AliProvider) DeleteVPC() error {
	if VpcID.ClusterValue(a.Infra.Spec) != "" && VpcID.Value(a.Infra.Status) != "" {
		return nil
	}
	request := vpc.CreateDeleteVpcRequest()
	request.Scheme = Scheme
	request.VpcId = VpcID.Value(a.Infra.Status)

	//response, err := d.Client.DeleteVpc(request)
	response := vpc.CreateDeleteVpcResponse()
	return a.RetryVpcRequest(request, response)
}

func (a *AliProvider) CreateVSwitch() error {
	if vSwitchID := VSwitchID.ClusterValue(a.Infra.Spec); vSwitchID != "" {
		logger.Debug("VSwitchID using default value")
		VSwitchID.SetValue(a.Infra.Status, vSwitchID)
		return nil
	}
	request := vpc.CreateCreateVSwitchRequest()
	request.Scheme = Scheme
	request.ZoneId = a.Infra.Status.Cluster.ZoneID
	request.CidrBlock = a.Infra.Spec.Metadata.Instance.Network.PrivateCidrIP
	request.VpcId = VpcID.Value(a.Infra.Status)
	request.RegionId = a.Infra.Status.Cluster.RegionID
	response := vpc.CreateCreateVSwitchResponse()
	err := a.RetryVpcRequest(request, response)
	if err != nil {
		return err
	}
	VSwitchID.SetValue(a.Infra.Status, response.VSwitchId)

	return nil
}

func (a *AliProvider) DeleteVSwitch() error {
	if VSwitchID.ClusterValue(a.Infra.Spec) != "" && VSwitchID.Value(a.Infra.Status) != "" {
		return nil
	}
	request := vpc.CreateDeleteVSwitchRequest()
	request.Scheme = Scheme
	request.VSwitchId = VSwitchID.Value(a.Infra.Status)

	response := vpc.CreateDeleteVSwitchResponse()
	return a.RetryVpcRequest(request, response)
}

func (a *AliProvider) CreateSecurityGroup() error {
	if securityGroupID := SecurityGroupID.ClusterValue(a.Infra.Spec); securityGroupID != "" {
		logger.Debug("securityGroupID using default value")
		SecurityGroupID.SetValue(a.Infra.Status, securityGroupID)
		return nil
	}
	request := ecs.CreateCreateSecurityGroupRequest()
	request.Scheme = Scheme
	request.RegionId = a.Infra.Status.Cluster.RegionID
	request.VpcId = VpcID.Value(a.Infra.Status)
	response := ecs.CreateCreateSecurityGroupResponse()
	err := a.RetryEcsRequest(request, response)
	if err != nil {
		return err
	}

	for _, port := range a.Infra.Spec.Metadata.Instance.Network.ExportPorts {
		if !a.AuthorizeSecurityGroup(response.SecurityGroupId, port) {
			return fmt.Errorf("authorize securitygroup port: %v failed", port)
		}
	}
	SecurityGroupID.SetValue(a.Infra.Status, response.SecurityGroupId)
	return nil
}

func (a *AliProvider) DeleteSecurityGroup() error {
	if SecurityGroupID.ClusterValue(a.Infra.Spec) != "" && SecurityGroupID.Value(a.Infra.Status) != "" {
		return nil
	}
	request := ecs.CreateDeleteSecurityGroupRequest()
	request.Scheme = Scheme
	request.SecurityGroupId = SecurityGroupID.Value(a.Infra.Status)

	response := ecs.CreateDeleteSecurityGroupResponse()
	return a.RetryEcsRequest(request, response)
}

func (a *AliProvider) GetAvailableZoneID() error {
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
	request := vpc.CreateDescribeZonesRequest()
	request.Scheme = Scheme
	response := vpc.CreateDescribeZonesResponse()
	err := a.RetryVpcRequest(request, response)
	if err != nil {
		return err
	}
	if len(response.Zones.Zone) == 0 {
		return errors.New("not available ZoneID ")
	}
	zoneID := response.Zones.Zone[rand.Rand(len(response.Zones.Zone))].ZoneId
	a.Infra.Status.Cluster.ZoneID = zoneID
	return nil
}

func (a *AliProvider) BindEipForMaster0() error {
	var host *v1beta1.InfraHost
	for _, h := range a.Infra.Status.Hosts {
		if strings2.In(v1beta1.Master, h.Roles) && h.Ready {
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
	a.Infra.Status.Cluster.Master0InternalIP = master0.PrimaryIPAddress
	return nil
}

func (a *AliProvider) allocateEipAddress() (eIP, eIPID string, err error) {
	request := vpc.CreateAllocateEipAddressRequest()
	request.Scheme = Scheme
	request.Bandwidth = a.Infra.Spec.Metadata.Instance.Network.Bandwidth
	request.InternetChargeType = "PayByTraffic"
	response := vpc.CreateAllocateEipAddressResponse()
	err = a.RetryVpcRequest(request, response)
	if err != nil {
		return "", "", err
	}
	return response.EipAddress, response.AllocationId, nil
}

func (a *AliProvider) associateEipAddress(instanceID, eipID string) error {
	request := vpc.CreateAssociateEipAddressRequest()
	request.Scheme = Scheme
	request.InstanceId = instanceID
	request.AllocationId = eipID

	response := vpc.CreateAssociateEipAddressResponse()
	return a.RetryVpcRequest(request, response)
}

func (a *AliProvider) unAssociateEipAddress() error {
	request := vpc.CreateUnassociateEipAddressRequest()
	request.Scheme = Scheme
	request.AllocationId = EipID.Value(a.Infra.Status)
	request.Force = requests.NewBoolean(true)
	response := vpc.CreateUnassociateEipAddressResponse()
	return a.RetryVpcRequest(request, response)
}

func (a *AliProvider) ReleaseEipAddress() error {
	err := a.unAssociateEipAddress()
	if err != nil {
		return err
	}
	request := vpc.CreateReleaseEipAddressRequest()
	request.Scheme = Scheme
	request.AllocationId = EipID.Value(a.Infra.Status)
	response := vpc.CreateReleaseEipAddressResponse()
	return a.RetryVpcRequest(request, response)
}
