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

	"github.com/fanux/sealos/pkg/utils"

	"github.com/aliyun/alibaba-cloud-sdk-go/sdk/requests"
	"github.com/aliyun/alibaba-cloud-sdk-go/sdk/responses"
	"github.com/aliyun/alibaba-cloud-sdk-go/services/vpc"
)

type VpcManager struct {
	Config Config
	Client *vpc.Client
}

func (a *AliProvider) RetryVpcRequest(request requests.AcsRequest, response responses.AcsResponse) error {
	return utils.Retry(TryTimes, TrySleepTime, func() error {
		err := a.VpcClient.DoAction(request, response)
		if err != nil {
			return err
		}
		return nil
	})
}

func (a *AliProvider) CreateVPC() error {
	request := vpc.CreateCreateVpcRequest()
	request.Scheme = Scheme
	request.RegionId = a.Config.RegionID
	//response, err := d.Client.CreateVpc(request)
	response := vpc.CreateCreateVpcResponse()
	err := a.RetryVpcRequest(request, response)
	if err != nil {
		return err
	}
	a.Infra.Annotations[VpcID] = response.VpcId
	a.Infra.Annotations[AliRegionID] = a.Config.RegionID
	return nil
}

func (a *AliProvider) DeleteVPC() error {
	request := vpc.CreateDeleteVpcRequest()
	request.Scheme = Scheme
	request.VpcId = a.Infra.Annotations[VpcID]

	//response, err := d.Client.DeleteVpc(request)
	response := vpc.CreateDeleteVpcResponse()
	return a.RetryVpcRequest(request, response)
}

func (a *AliProvider) CreateVSwitch() error {
	request := vpc.CreateCreateVSwitchRequest()
	request.Scheme = Scheme
	request.ZoneId = a.Infra.Annotations[ZoneID]
	request.CidrBlock = CidrBlock
	request.VpcId = a.Infra.GetAnnotationsByKey(VpcID)
	request.RegionId = a.Config.RegionID
	//response, err := d.Client.CreateVSwitch(request)
	response := vpc.CreateCreateVSwitchResponse()
	err := a.RetryVpcRequest(request, response)
	if err != nil {
		return err
	}
	a.Infra.Annotations[VSwitchID] = response.VSwitchId
	return nil
}

func (a *AliProvider) DeleteVSwitch() error {
	request := vpc.CreateDeleteVSwitchRequest()
	request.Scheme = Scheme
	request.VSwitchId = a.Infra.Annotations[VSwitchID]

	response := vpc.CreateDeleteVSwitchResponse()
	return a.RetryVpcRequest(request, response)
}

func (a *AliProvider) GetZoneID() error {
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
	a.Infra.Annotations[ZoneID] = response.Zones.Zone[0].ZoneId

	return nil
}

func (a *AliProvider) BindEipForMaster0() error {
	instances, err := a.GetInstancesInfo(Master, JustGetInstanceInfo)
	if err != nil {
		return err
	}
	if len(instances) == 0 {
		return errors.New("can not find master0 ")
	}
	master0 := instances[0]
	eIP, eIPID, err := a.AllocateEipAddress()
	if err != nil {
		return err
	}
	err = a.AssociateEipAddress(master0.InstanceID, eIPID)
	if err != nil {
		return err
	}
	a.Infra.Annotations[Eip] = eIP
	a.Infra.Annotations[EipID] = eIPID
	a.Infra.Annotations[Master0ID] = master0.InstanceID
	a.Infra.Annotations[Master0InternalIP] = master0.PrimaryIPAddress
	return nil
}

func (a *AliProvider) AllocateEipAddress() (eIP, eIPID string, err error) {
	request := vpc.CreateAllocateEipAddressRequest()
	request.Scheme = Scheme
	request.Bandwidth = Bandwidth
	//response, err := d.Client.AllocateEipAddress(request)
	response := vpc.CreateAllocateEipAddressResponse()
	err = a.RetryVpcRequest(request, response)
	if err != nil {
		return "", "", err
	}
	return response.EipAddress, response.AllocationId, nil
}

func (a *AliProvider) AssociateEipAddress(instanceID, eipID string) error {
	request := vpc.CreateAssociateEipAddressRequest()
	request.Scheme = Scheme
	request.InstanceId = instanceID
	request.AllocationId = eipID

	response := vpc.CreateAssociateEipAddressResponse()
	return a.RetryVpcRequest(request, response)
}

func (a *AliProvider) UnassociateEipAddress() error {
	request := vpc.CreateUnassociateEipAddressRequest()
	request.Scheme = Scheme
	request.AllocationId = a.Infra.Annotations[EipID]
	request.Force = requests.NewBoolean(true)
	response := vpc.CreateUnassociateEipAddressResponse()
	return a.RetryVpcRequest(request, response)
}

func (a *AliProvider) ReleaseEipAddress() error {
	err := a.UnassociateEipAddress()
	if err != nil {
		return err
	}
	request := vpc.CreateReleaseEipAddressRequest()
	request.Scheme = Scheme
	request.AllocationId = a.Infra.Annotations[EipID]
	response := vpc.CreateReleaseEipAddressResponse()
	return a.RetryVpcRequest(request, response)
}
