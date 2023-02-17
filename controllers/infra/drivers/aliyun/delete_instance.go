package aliyun

import (
	"fmt"
	"time"

	"github.com/labring/sealos/pkg/utils/retry"

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/aliyun/alibaba-cloud-sdk-go/services/ecs"

	v1 "github.com/labring/sealos/controllers/infra/api/v1"
)

type ECSDeleteInstancesAPI interface {
	DeleteInstances(request *ecs.DeleteInstancesRequest) (response *ecs.DeleteInstancesResponse, err error)
}

func DeleteInstances(api ECSDeleteInstancesAPI, request *ecs.DeleteInstancesRequest) (*ecs.DeleteInstancesResponse, error) {
	return api.DeleteInstances(request)
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
	logger.Info("Deleting Aliyun ECS instances: %v", instanceIDs)
	deleteInstancesRequest := &ecs.DeleteInstancesRequest{
		RpcRequest: ecs.CreateDeleteInstancesRequest().RpcRequest,
		InstanceId: &instanceIDs,
		Force:      "true",
	}
	err := retry.Retry(30, 10*time.Second, func() error {
		_, err := DeleteInstances(client, deleteInstancesRequest)
		if err != nil {
			return fmt.Errorf("got an error deleting Aliyun ECS instances: %v", err)
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("delete instances failed: %v", err)
	}
	return nil
}
