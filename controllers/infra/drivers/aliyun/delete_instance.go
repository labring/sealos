package aliyun

import (
	"fmt"
	"strings"
	"time"

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
	client := d.Client
	instanceIDs := make([]string, hosts.Count)
	for i := 0; i < hosts.Count; i++ {
		if len(hosts.Metadata) == 0 {
			return nil
		}
		metadata := hosts.Metadata[i]
		instanceIDs[i] = metadata.ID
	}
	if len(instanceIDs) == 0 {
		return nil
	}

	// get instance info
	describeInstanceRequest := &ecs.DescribeInstancesRequest{
		RpcRequest:  ecs.CreateDescribeInstancesRequest().RpcRequest,
		InstanceIds: "[\"" + instanceIDs[0] + "\"]",
	}
	describeInstanceResponse, err := GetInstances(client, describeInstanceRequest)
	if err != nil || len(describeInstanceResponse.Instances.Instance) == 0 {
		return fmt.Errorf("got an error getting instance info: %v", err)
	}

	// detach keypair
	instance := describeInstanceResponse.Instances.Instance[0]
	detachKeyPairRequest := &ecs.DetachKeyPairRequest{
		RpcRequest:  ecs.CreateDetachKeyPairRequest().RpcRequest,
		InstanceIds: "[\"" + strings.Join(instanceIDs, ",") + "\"]",
		KeyPairName: instance.KeyPairName,
	}

	logger.Info("Detaching keypair %s from instances %v", instance.KeyPairName, instanceIDs)
	_, err = DetachKeyPair(client, detachKeyPairRequest)
	if err != nil {
		return fmt.Errorf("got an error detaching keypair %s from instances %v: %v", instance.KeyPairName, instanceIDs, err)
	}

	// delete instances
	deleteInstancesRequest := &ecs.DeleteInstancesRequest{
		RpcRequest: ecs.CreateDeleteInstancesRequest().RpcRequest,
		InstanceId: &instanceIDs,
		Force:      "true",
	}
	logger.Info("Deleting Aliyun ECS instances: %v", instanceIDs)
	err = retry.Retry(30, 10*time.Second, func() error {
		_, err := DeleteInstances(client, deleteInstancesRequest)
		if err != nil {
			return fmt.Errorf("got an error deleting Aliyun ECS instances: %v", err)
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("delete instances failed: %v", err)
	}

	//TODO: delete security group, vswitch, vpc
	//// delete security group
	//if len(instance.SecurityGroupIds.SecurityGroupId) == 0 {
	//	return fmt.Errorf("got an error getting security group: %v", err)
	//}
	//securityGroupID := instance.SecurityGroupIds.SecurityGroupId[0]
	//deleteSecurityGroupRequest := &ecs.DeleteSecurityGroupRequest{
	//	RpcRequest:      ecs.CreateDeleteSecurityGroupRequest().RpcRequest,
	//	SecurityGroupId: securityGroupID,
	//}
	//logger.Info("Deleting security group %s", securityGroupID)
	//_, err = DeleteSecurityGroup(client, deleteSecurityGroupRequest)
	//if err != nil {
	//	logger.Info("can't delete security group %s yet: %v", securityGroupID, err)
	//}
	//
	//// delete vswitch
	//vSwitchID := instance.VpcAttributes.VSwitchId
	//deleteVSwitchRequest := &ecs.DeleteVSwitchRequest{
	//	RpcRequest: ecs.CreateDeleteVSwitchRequest().RpcRequest,
	//	VSwitchId:  vSwitchID,
	//}
	//logger.Info("Deleting vswitch %s", vSwitchID)
	//_, err = DeleteVSwitch(client, deleteVSwitchRequest)
	//if err != nil {
	//	logger.Info("can't delete vswitch %s yet: %v", vSwitchID, err)
	//}
	//
	//// delete vpc
	//vpcID := instance.VpcAttributes.VpcId
	//deleteVPCRequest := &ecs.DeleteVpcRequest{
	//	RpcRequest: ecs.CreateDeleteVpcRequest().RpcRequest,
	//	VpcId:      vpcID,
	//}
	//logger.Info("Deleting vpc %s", vpcID)
	//_, err = DeleteVPC(client, deleteVPCRequest)
	//if err != nil {
	//	logger.Info("can't delete vpc %s yet: %v", vpcID, err)
	//}
	return nil
}
