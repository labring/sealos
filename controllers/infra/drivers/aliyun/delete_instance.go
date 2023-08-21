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
	"context"
	"fmt"
	"time"

	"github.com/labring/sealos/controllers/cluster/common"

	"golang.org/x/sync/errgroup"

	"github.com/aliyun/alibaba-cloud-sdk-go/services/ecs"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/retry"

	v1 "github.com/labring/sealos/controllers/infra/api/v1"
)

type ECSDeleteInstancesAPI interface {
	DeleteInstances(request *ecs.DeleteInstancesRequest) (response *ecs.DeleteInstancesResponse, err error)
	DeleteSecurityGroup(request *ecs.DeleteSecurityGroupRequest) (response *ecs.DeleteSecurityGroupResponse, err error)
	DeleteVSwitch(request *ecs.DeleteVSwitchRequest) (response *ecs.DeleteVSwitchResponse, err error)
	DeleteVpc(request *ecs.DeleteVpcRequest) (response *ecs.DeleteVpcResponse, err error)
	DetachKeyPair(request *ecs.DetachKeyPairRequest) (response *ecs.DetachKeyPairResponse, err error)
}

func DeleteInstances(api ECSDeleteInstancesAPI, request *ecs.DeleteInstancesRequest) (*ecs.DeleteInstancesResponse, error) {
	return api.DeleteInstances(request)
}

func DetachKeyPair(api ECSDeleteInstancesAPI, request *ecs.DetachKeyPairRequest) (*ecs.DetachKeyPairResponse, error) {
	return api.DetachKeyPair(request)
}

func DeleteVPC(api ECSDeleteInstancesAPI, request *ecs.DeleteVpcRequest) (*ecs.DeleteVpcResponse, error) {
	return api.DeleteVpc(request)
}

func DeleteVSwitch(api ECSDeleteInstancesAPI, request *ecs.DeleteVSwitchRequest) (*ecs.DeleteVSwitchResponse, error) {
	return api.DeleteVSwitch(request)
}

func DeleteSecurityGroup(api ECSDeleteInstancesAPI, request *ecs.DeleteSecurityGroupRequest) (*ecs.DeleteSecurityGroupResponse, error) {
	return api.DeleteSecurityGroup(request)
}

func (d Driver) deleteInstances(hosts *v1.Hosts) error {
	return d.deleteInstancesByOption(hosts, false)
}

func (d Driver) deleteInfra(infra *v1.Infra) error {
	if len(infra.Spec.Hosts) == 0 {
		return nil
	}
	client := d.ECSClient
	eg, _ := errgroup.WithContext(context.Background())
	var instanceID string
	for _, hosts := range infra.Spec.Hosts {
		if len(hosts.Metadata) != 0 {
			instanceID = hosts.Metadata[0].ID
		}
	}
	if len(instanceID) == 0 {
		logger.Info("no instance need to be deleted")
		return nil
	}

	// get instance info
	describeInstanceRequest := &ecs.DescribeInstancesRequest{
		RpcRequest:  ecs.CreateDescribeInstancesRequest().RpcRequest,
		InstanceIds: "[\"" + instanceID + "\"]",
	}
	describeInstanceResponse, err := GetInstances(client, describeInstanceRequest)
	if err != nil || len(describeInstanceResponse.Instances.Instance) == 0 {
		return fmt.Errorf("failed to get instance info: %v", err)
	}
	instance := describeInstanceResponse.Instances.Instance[0]

	// delete instances
	for i := range infra.Spec.Hosts {
		hosts := infra.Spec.Hosts[i]
		eg.Go(func() error {
			return d.deleteInstancesByOption(&hosts, true)
		})
	}
	if err = eg.Wait(); err != nil {
		return fmt.Errorf("failed to delete instances: %v", err)
	}

	// delete security group
	if len(instance.SecurityGroupIds.SecurityGroupId) == 0 {
		return fmt.Errorf("failed to get security group id")
	}
	securityGroupID := instance.SecurityGroupIds.SecurityGroupId[0]
	deleteSecurityGroupRequest := &ecs.DeleteSecurityGroupRequest{
		RpcRequest:      ecs.CreateDeleteSecurityGroupRequest().RpcRequest,
		SecurityGroupId: securityGroupID,
	}
	logger.Info("Deleting security group %s", securityGroupID)
	err = retry.Retry(30, 5*time.Second, func() error {
		_, err := DeleteSecurityGroup(client, deleteSecurityGroupRequest)
		if err != nil {
			return fmt.Errorf("failed to delete security group %s: %v", securityGroupID, err)
		}
		return nil
	})
	if err != nil {
		logger.Info("can't delete security group %s yet: %v", securityGroupID, err)
	}

	// delete vswitch
	vSwitchID := instance.VpcAttributes.VSwitchId
	deleteVSwitchRequest := &ecs.DeleteVSwitchRequest{
		RpcRequest: ecs.CreateDeleteVSwitchRequest().RpcRequest,
		VSwitchId:  vSwitchID,
	}
	logger.Info("Deleting vswitch %s", vSwitchID)
	err = retry.Retry(30, 5*time.Second, func() error {
		_, err := DeleteVSwitch(client, deleteVSwitchRequest)
		if err != nil {
			return fmt.Errorf("failed to delete vswitch %s: %v", vSwitchID, err)
		}
		return nil
	})
	if err != nil {
		logger.Info("can't delete vswitch %s yet: %v", vSwitchID, err)
	}

	// delete vpc
	vpcID := instance.VpcAttributes.VpcId
	deleteVPCRequest := &ecs.DeleteVpcRequest{
		RpcRequest: ecs.CreateDeleteVpcRequest().RpcRequest,
		VpcId:      vpcID,
	}
	logger.Info("Deleting vpc %s", vpcID)
	err = retry.Retry(30, 5*time.Second, func() error {
		_, err := DeleteVPC(client, deleteVPCRequest)
		if err != nil {
			return fmt.Errorf("failed to delete vpc %s: %v", vpcID, err)
		}
		return nil
	})
	if err != nil {
		logger.Info("can't delete vpc %s yet: %v", vpcID, err)
	}

	// delete keypair
	deleteKeyPairRequest := &ecs.DeleteKeyPairsRequest{
		RpcRequest:   ecs.CreateDeleteKeyPairsRequest().RpcRequest,
		KeyPairNames: "[\"" + instance.KeyPairName + "\"]",
	}
	logger.Info("Deleting keypair %s", instance.KeyPairName)
	err = retry.Retry(30, 5*time.Second, func() error {
		_, err := DeleteKeyPairs(client, deleteKeyPairRequest)
		if err != nil {
			return fmt.Errorf("failed to delete keypair %s: %v", instance.KeyPairName, err)
		}
		return nil
	})
	if err != nil {
		logger.Info("can't delete keypair %s yet: %v", instanceID, err)
	}
	logger.Info("Delete infra %s success", infra.Name)
	return nil
}

func (d Driver) deleteInstancesByOption(hosts *v1.Hosts, deleteAll bool) error {
	client := d.ECSClient
	var instanceIDs []string
	idx := 0
	for i := 0; i < hosts.Count; i++ {
		if len(hosts.Metadata) <= idx {
			break
		}
		metadata := hosts.Metadata[idx]
		// if deleteAll is false, skip master0
		if _, ok := metadata.Labels[common.Master0Label]; ok && !deleteAll {
			idx++
			i--
			continue
		}
		instanceIDs = append(instanceIDs, metadata.ID)
		idx++
	}
	if len(instanceIDs) == 0 {
		logger.Info("not have Aliyun ECS instances to delete")
		return nil
	}

	// delete instances
	deleteInstancesRequest := &ecs.DeleteInstancesRequest{
		RpcRequest: ecs.CreateDeleteInstancesRequest().RpcRequest,
		InstanceId: &instanceIDs,
		Force:      "true",
	}
	logger.Info("Deleting Aliyun ECS instances: %v", instanceIDs)
	err := retry.Retry(30, 10*time.Second, func() error {
		_, err := DeleteInstances(client, deleteInstancesRequest)
		if err != nil {
			return fmt.Errorf("failed to delete instances: %v", err)
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("delete instances failed: %v", err)
	}
	return nil
}
