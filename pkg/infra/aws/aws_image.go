// Copyright © 2021 Awsbaba Group Holding Ltd.
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

package aws

import (
	"fmt"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/ec2"
	"github.com/pkg/errors"
	"strconv"

	"github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/logger"
)

func (a *AwsProvider) GetDefaultDiskCategories(host *v1beta1.InfraHost) (system []string, data []string) {
	if host.Disks[0].Category != "" {
		system = []string{host.Disks[0].Category}
	} else {
		logger.Warn("host tags is %v,system category not set", host.Roles)
		system = categories
	}
	if len(host.Disks) > 1 {
		if host.Disks[1].Category != "" {
			data = []string{host.Disks[1].Category}
		} else {
			logger.Warn("host tags is %v,data category not set", host.Roles)
			data = categories
		}
	}
	return
}

// GetAvailableInstanceType 根据yaml memory, cpu, arch 找到匹配的instance type
func (a *AwsProvider) GetAvailableInstanceType(host *v1beta1.InfraHost) ([]string, error) {
	// 根据cpu, memory, arch 找到对应的instance
	filters := make([]*ec2.Filter, 0)
	if host.Memory <= 0 {
		return nil, errors.New("host memory is not correct.")
	}
	filters = append(filters, &ec2.Filter{
		Name: aws.String("memory-info.size-in-mib"),
		Values: []*string{
			aws.String(strconv.Itoa(host.Memory * 1024)),
		},
	})
	if host.CPU <= 0 {
		return nil, errors.New("host cpu is not correct.")
	}
	filters = append(filters, &ec2.Filter{
		Name: aws.String("vcpu-info.default-cores"),
		Values: []*string{
			aws.String(strconv.Itoa(host.CPU)),
		},
	})
	if string(host.Arch) != "" {
		filters = append(filters, &ec2.Filter{
			Name: aws.String("processor-info.supported-architecture"),
			Values: []*string{
				aws.String(string(ConvertImageArch(host.Arch))),
			},
		})
	}
	input := &ec2.DescribeInstanceTypesInput{
		Filters: filters,
	}
	instancesOutput, err := a.EC2Helper.GetInstanceTypes(input)
	if err != nil {
		return nil, errors.New("please supply the correct ec2type...")
	}
	if len(instancesOutput) == 0 {
		return nil, errors.New("instance type is empty")
	}
	var types []string
	for idx := range instancesOutput {
		types = append(types, *instancesOutput[idx].InstanceType)
	}
	if len(types) == 0 {
		return nil, errors.New("can not find ecs type(ec2type) for aws provider")
	}
	return types, nil
}

func (a *AwsProvider) GetAvailableResource(host *v1beta1.InfraHost, systemCategory, dataCategory string) (instanceType []string, err error) {
	j := a.Infra.Status.FindHostsByRoles(host.Roles)
	if j == -1 {
		return nil, fmt.Errorf("failed to get ecs instance type, %v", "not find host status,pelase retry")
	}

	if a.Infra.Status.Hosts[j].InstanceType != "" {
		defaultInstanceType := []string{a.Infra.Status.Hosts[j].InstanceType}
		instanceType = append(defaultInstanceType, instanceType...)
	}

	return
}
