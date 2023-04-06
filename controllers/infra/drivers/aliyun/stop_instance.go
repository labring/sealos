package aliyun

import (
	"fmt"

	"github.com/aliyun/alibaba-cloud-sdk-go/services/ecs"
	v1 "github.com/labring/sealos/controllers/infra/api/v1"
	"github.com/labring/sealos/pkg/utils/logger"
)

type ECSStopInstancesAPI interface {
	StopInstances(request *ecs.StopInstancesRequest) (response *ecs.StopInstancesResponse, err error)
}

func StopInstances(api ECSStopInstancesAPI, request *ecs.StopInstancesRequest) (*ecs.StopInstancesResponse, error) {
	return api.StopInstances(request)
}

func (d Driver) stopInstances(host *v1.Hosts) error {
	client := d.ECSClient
	instanceIDs := make([]string, host.Count)
	for i := 0; i < host.Count; i++ {
		if len(host.Metadata) == 0 {
			return nil
		}
		metadata := host.Metadata[i]
		instanceIDs[i] = metadata.ID
	}

	logger.Info("Stopping Aliyun ECS instances: %v", instanceIDs)
	stopInstancesRequest := &ecs.StopInstancesRequest{
		RpcRequest:  ecs.CreateStopInstancesRequest().RpcRequest,
		InstanceId:  &instanceIDs,
		StoppedMode: "StopCharging",
		ForceStop:   "true",
	}
	_, err := StopInstances(client, stopInstancesRequest)
	if err != nil {
		return fmt.Errorf("got an error stopping Aliyun ECS instances: %v", err)
	}
	return nil
}
