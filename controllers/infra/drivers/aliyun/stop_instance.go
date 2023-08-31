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
