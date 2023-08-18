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

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/aliyun/alibaba-cloud-sdk-go/services/ecs"
	v1 "github.com/labring/sealos/controllers/infra/api/v1"
	"github.com/labring/sealos/pkg/utils/retry"
	"golang.org/x/sync/errgroup"
)

type ECSModifyInstancesAPI interface {
	ModifyInstanceSpec(request *ecs.ModifyInstanceSpecRequest) (response *ecs.ModifyInstanceSpecResponse, err error)
	StartInstances(request *ecs.StartInstancesRequest) (response *ecs.StartInstancesResponse, err error)
}

func ModifyInstanceSpec(api ECSModifyInstancesAPI, request *ecs.ModifyInstanceSpecRequest) (*ecs.ModifyInstanceSpecResponse, error) {
	return api.ModifyInstanceSpec(request)
}

func StartInstances(api ECSModifyInstancesAPI, request *ecs.StartInstancesRequest) (*ecs.StartInstancesResponse, error) {
	return api.StartInstances(request)
}

func (d Driver) modifyInstance(curHosts *v1.Hosts, desHosts *v1.Hosts) error {
	client := d.ECSClient
	eg, _ := errgroup.WithContext(context.Background())
	err := d.stopInstances(curHosts)
	if err != nil {
		return err
	}
	instanceIDs := make([]string, len(curHosts.Metadata))
	for i, metadata := range curHosts.Metadata {
		instanceIDs[i] = metadata.ID
	}

	logger.Info("Modifying Aliyun ECS instances: %v", instanceIDs)
	for _, instanceID := range instanceIDs {
		modifyInstanceSpecRequest := &ecs.ModifyInstanceSpecRequest{
			RpcRequest:   ecs.CreateModifyInstanceSpecRequest().RpcRequest,
			InstanceId:   instanceID,
			InstanceType: desHosts.Flavor,
		}
		eg.Go(func() error {
			return retry.Retry(3, 5*time.Second, func() error {
				_, err := ModifyInstanceSpec(client, modifyInstanceSpecRequest)
				if err != nil {
					return err
				}
				return nil
			})
		})
	}
	if err := eg.Wait(); err != nil {
		return fmt.Errorf("modify instance spec failed: %v", err)
	}

	logger.Info("Starting Aliyun ECS instances: %v", instanceIDs)
	startInstancesRequest := &ecs.StartInstancesRequest{
		RpcRequest: ecs.CreateStartInstancesRequest().RpcRequest,
		InstanceId: &instanceIDs,
	}
	_, err = StartInstances(client, startInstancesRequest)
	if err != nil {
		return fmt.Errorf("start instances failed: %v", err)
	}
	err = d.waitInstancesRunning(&instanceIDs)
	if err != nil {
		return fmt.Errorf("wait instances running failed: %v", err)
	}
	return nil
}
