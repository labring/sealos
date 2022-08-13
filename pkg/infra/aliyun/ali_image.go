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
	"fmt"
	"strings"

	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/rand"
	strings2 "github.com/labring/sealos/pkg/utils/strings"

	"github.com/aliyun/alibaba-cloud-sdk-go/sdk/requests"
	"github.com/aliyun/alibaba-cloud-sdk-go/services/ecs"

	"github.com/labring/sealos/pkg/types/v1beta1"
)

func (a *AliProvider) GetAvailableImageID(host *v1beta1.InfraHost) (string, error) {
	if host.OS.ID != "" {
		logger.Info("host tags is %v,using imageID is %s", host.Roles, host.OS.ID)
		return host.OS.ID, nil
	}
	logger.Warn("tips: imageID not set,so imageID is random.that will maybe let instanceType not find.")
	request := ecs.CreateDescribeImagesRequest()
	request.ImageOwnerAlias = "system"
	request.PageSize = "100"
	request.Architecture = string(ConvertImageArch(host.Arch))
	request.OSType = "linux"
	response := ecs.CreateDescribeImagesResponse()
	err := a.RetryEcsRequest(request, response)
	if err != nil {
		return "", fmt.Errorf("get ImageID failed , error :%v", err)
	}
	if response.TotalCount == 0 {
		return "", fmt.Errorf("ImageID list is empty")
	}
	var images []string

	for _, image := range response.Images.Image {
		flag := true
		imagesName := strings.ToLower(image.Platform)
		imagesName = strings.ReplaceAll(imagesName, " ", "_")
		if strings.ToLower(host.OS.Name) != "" {
			if imagesName != strings.ToLower(host.OS.Name) {
				flag = false
			}
		}
		if strings.ToLower(host.OS.Version) != "" {
			imageID := strings.ReplaceAll(image.ImageName, imagesName, "")
			imageIDArr := strings.Split(imageID, "_")
			var versions []string
			for _, v := range imageIDArr {
				if v == string(ConvertImageArch(host.Arch)) {
					break
				} else {
					versions = append(versions, v)
				}
			}
			version := strings.Join(versions, ".")
			//7.1,7,7.3,8.7
			if !strings.HasPrefix(version, strings.ToLower(host.OS.Version)) {
				flag = false
			}
		}
		if flag {
			logger.Debug("host tags is %v,search imageID is %s", host.Roles, image.ImageId)
			images = append(images, image.ImageId)
		}
	}
	if len(images) == 0 {
		return "", fmt.Errorf("search ImageID list is empty")
	}
	logger.Info("host tags is %v,using first imageID is %s", host.Roles, images[0])
	return images[rand.Rand(len(images))], nil
}

func (a *AliProvider) GetDefaultDiskCategories(host *v1beta1.InfraHost) (system []string, data []string) {
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

func (a *AliProvider) GetAvailableInstanceType(host *v1beta1.InfraHost) ([]string, error) {
	j := a.Infra.Status.FindHostsByRoles(host.Roles)
	if j == -1 {
		return nil, fmt.Errorf("failed to get host, %v", "not find host status,pelase retry")
	}
	if host.EcsType != "" {
		a.Infra.Status.Hosts[j].DataCategory = categories[2]
		a.Infra.Status.Hosts[j].SystemCategory = categories[2]
		return []string{host.EcsType}, nil
	}
	var systemInstanceTypes []string

	var err error
	systemDisk, dataDisk := a.GetDefaultDiskCategories(host)

	for _, sys := range systemDisk {
		if len(dataDisk) > 0 {
			for _, data := range dataDisk {
				logger.Debug("host tags is %v,search systemDiskCategory=%s,dataDiskCategory=%s", host.Roles, sys, data)
				systemInstanceTypes, err = a.GetAvailableResource(host, sys, data)
				if err == nil {
					for i := 0; i < len(host.Disks); i++ {
						host.Disks[i].Category = data
					}
					host.Disks[0].Category = sys
					a.Infra.Status.Hosts[j].DataCategory = data
					a.Infra.Status.Hosts[j].SystemCategory = sys
					break
				}
			}
		} else {
			logger.Debug("host tags is %v,search systemDiskCategory=%s", host.Roles, sys)
			systemInstanceTypes, err = a.GetAvailableResource(host, sys, "")
			if err == nil {
				host.Disks[0].Category = sys
				a.Infra.Status.Hosts[j].SystemCategory = sys
				break
			}
		}
	}

	if len(systemInstanceTypes) < 1 {
		return nil, fmt.Errorf("host tags is %v,systemInstanceType not find", host.Roles)
	}

	var instanceTypes []string
	if err != nil {
		return nil, err
	}

	request := ecs.CreateDescribeImageSupportInstanceTypesRequest()
	request.Scheme = Scheme
	request.RegionId = a.Infra.Status.Cluster.RegionID
	request.ImageId = a.Infra.Status.Hosts[j].ImageID

	response := ecs.CreateDescribeImageSupportInstanceTypesResponse()
	err = a.EcsClient.DoAction(request, response)
	if err != nil {
		return nil, err
	}
	for _, i := range response.InstanceTypes.InstanceType {
		if i.CpuCoreCount == host.CPU && int(i.MemorySize) == host.Memory {
			if strings2.In(i.InstanceTypeId, systemInstanceTypes) {
				logger.Debug("host tags is %v,append InstanceType is %s", host.Roles, i.InstanceTypeId)
				instanceTypes = append(instanceTypes, i.InstanceTypeId)
			}
		}
	}
	if len(instanceTypes) < 1 {
		return nil, fmt.Errorf("host tags is %v,instanceType not find", host.Roles)
	}
	return instanceTypes, nil
}

func (a *AliProvider) GetAvailableResource(host *v1beta1.InfraHost, systemCategory, dataCategory string) (instanceType []string, err error) {
	request := ecs.CreateDescribeAvailableResourceRequest()
	request.Scheme = Scheme
	request.RegionId = a.Infra.Status.Cluster.RegionID
	request.ZoneId = a.Infra.Status.Cluster.ZoneID
	request.DestinationResource = "InstanceType"
	request.InstanceChargeType = "PostPaid"
	request.SpotStrategy = a.Infra.Status.Cluster.SpotStrategy
	request.SystemDiskCategory = systemCategory
	request.DataDiskCategory = dataCategory
	request.Cores = requests.NewInteger(host.CPU)
	request.Memory = requests.NewFloat(float64(host.Memory))
	response := ecs.CreateDescribeAvailableResourceResponse()
	err = a.EcsClient.DoAction(request, response)
	if err != nil {
		return nil, err
	}
	if len(response.AvailableZones.AvailableZone) < 1 {
		return nil, fmt.Errorf("available zone  not find")
	}
	for _, i := range response.AvailableZones.AvailableZone {
		for _, f := range i.AvailableResources.AvailableResource {
			for _, r := range f.SupportedResources.SupportedResource {
				if r.StatusCategory == "WithStock" {
					instanceType = append(instanceType, r.Value)
				}
			}
		}
	}
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
