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
	"github.com/labring/sealos/pkg/utils/retry"
	"github.com/labring/sealos/pkg/utils/strings"

	"github.com/aliyun/alibaba-cloud-sdk-go/sdk/requests"
	"github.com/aliyun/alibaba-cloud-sdk-go/sdk/responses"
	"github.com/aliyun/alibaba-cloud-sdk-go/services/ecs"
)

func (a *AliProvider) RetryVpcRequest(request requests.AcsRequest, response responses.AcsResponse) error {
	return retry.Retry(TryTimes, TrySleepTime, func() error {
		err := a.VpcClient.DoAction(request, response)
		if err != nil {
			return err
		}
		return nil
	})
}

func (a *AliProvider) RetryEcsRequest(request requests.AcsRequest, response responses.AcsResponse) error {
	return a.RetryEcsAction(request, response, TryTimes)
}

func (a *AliProvider) RetryEcsAction(request requests.AcsRequest, response responses.AcsResponse, tryTimes int) error {
	return retry.Retry(tryTimes, TrySleepTime, func() error {
		err := a.EcsClient.DoAction(request, response)
		if err != nil {
			return err
		}
		return nil
	})
}

func (a *AliProvider) RetryEcsInstanceType(request requests.AcsRequest, response responses.AcsResponse, instances, instanceRole []string) error {
	for i := 0; i < len(instances); i++ {
		switch req := request.(type) {
		case *ecs.ModifyInstanceSpecRequest:
			req.InstanceType = instances[i]
		case *ecs.RunInstancesRequest:
			req.InstanceType = instances[i]
		}
		err := a.RetryEcsAction(request, response, 4)
		if err == nil {
			logger.Info("use instance type: %s", instances[i])
			j := a.Infra.Status.FindHostsByRoles(instanceRole)
			if j == -1 {
				return fmt.Errorf("failed to get ecs instance type, %v", "not find host status,pelase retry")
			}
			a.Infra.Status.Hosts[j].InstanceType = instances[i]
			break
		} else {
			logger.Warn("failed to get ecs instance type: %s", instances[i])
			if i == len(instances)-1 {
				return fmt.Errorf("failed to get ecs instance type, %v", err)
			}
		}
	}
	return nil
}

func (a *AliProvider) TryGetInstance(request *ecs.DescribeInstancesRequest, response *ecs.DescribeInstancesResponse, expectCount int) error {
	return retry.Retry(TryTimes, TrySleepTime, func() error {
		err := a.EcsClient.DoAction(request, response)
		var ipList []string
		if err != nil {
			return err
		}
		instances := response.Instances.Instance
		if expectCount == -1 {
			return nil
		}

		if len(instances) != expectCount {
			return errors.New("the number of instances is not as expected")
		}
		for _, instance := range instances {
			if instance.NetworkInterfaces.NetworkInterface[0].PrimaryIpAddress == "" {
				return errors.New("PrimaryIpAddress cannt nob be nil")
			}
			if len(ipList) != 0 && strings.In(instance.NetworkInterfaces.NetworkInterface[0].PrimaryIpAddress, ipList) {
				return errors.New("PrimaryIpAddress cannt nob be same")
			}

			ipList = append(ipList, instance.NetworkInterfaces.NetworkInterface[0].PrimaryIpAddress)
		}

		return nil
	})
}
