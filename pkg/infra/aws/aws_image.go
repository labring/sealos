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

package aws_provider

import (
	"fmt"
	"github.com/aws/aws-sdk-go/service/ec2"
	"github.com/pkg/errors"

	"github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/logger"
)

func (a *AwsProvider) GetAvailableImageID(host *v1beta1.InfraHost) (string, error) {
	if host.OS.ID != "" {
		logger.Info("host tags is %v,using imageID is %s", host.Roles, host.OS.ID)
		return host.OS.ID, nil
	}
	instanceTypeInfo, err := a.EC2Helper.GetInstanceType(host.EcsType)
	if err != nil {
		return "", errors.New("please supply the correct ec2type...")
	}
	if *instanceTypeInfo.InstanceStorageSupported {
		rootDeviceType = "instance-store"
	}

	latestImages, err := a.EC2Helper.GetLatestImages(&rootDeviceType, instanceTypeInfo.ProcessorInfo.SupportedArchitectures)
	if err != nil {
		return "", err
	}
	if latestImages == nil || len(*latestImages) <= 0 {
		return "", errors.New("No default image found")
	}

	var topImage *ec2.Image

	// Pick the available image with the highest priority as the default choice
	for _, osName := range GetImagePriority() {
		image, found := (*latestImages)[osName]
		if found {
			topImage = image
			break
		}
	}

	return *topImage.ImageId, nil
}

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

func (a *AwsProvider) GetAvailableInstanceType(host *v1beta1.InfraHost) ([]string, error) {
	// check Host EcsType is valid
	if host.EcsType != "" {
		output, err := a.EC2Helper.GetInstanceTypes(&ec2.DescribeInstanceTypesInput{
			InstanceTypes: []*string{&host.EcsType},
		})
		if err != nil {
			return nil, err
		}
		var ist []string
		for _, i := range output {
			ist = append(ist, *i.InstanceType)
		}
		return ist, nil
	}
	return nil, errors.New("Please specify the ecs type(ec2type) for aws provider")
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
