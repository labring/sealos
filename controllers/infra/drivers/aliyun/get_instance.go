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
	"sort"
	"strconv"

	"github.com/labring/sealos/pkg/types/v1beta1"

	"github.com/aliyun/alibaba-cloud-sdk-go/services/ecs"
	v1 "github.com/labring/sealos/controllers/infra/api/v1"
	"github.com/labring/sealos/controllers/infra/common"
	"github.com/labring/sealos/pkg/utils/logger"
)

type ECSDescribeInstancesAPI interface {
	DescribeInstances(request *ecs.DescribeInstancesRequest) (response *ecs.DescribeInstancesResponse, err error)
	DescribeDisks(request *ecs.DescribeDisksRequest) (response *ecs.DescribeDisksResponse, err error)
	DescribeImages(request *ecs.DescribeImagesRequest) (response *ecs.DescribeImagesResponse, err error)
	DescribeInstanceStatus(request *ecs.DescribeInstanceStatusRequest) (response *ecs.DescribeInstanceStatusResponse, err error)
	TagResources(request *ecs.TagResourcesRequest) (response *ecs.TagResourcesResponse, err error)
}

func GetInstances(api ECSDescribeInstancesAPI, request *ecs.DescribeInstancesRequest) (*ecs.DescribeInstancesResponse, error) {
	return api.DescribeInstances(request)
}

func GetDisks(api ECSDescribeInstancesAPI, request *ecs.DescribeDisksRequest) (*ecs.DescribeDisksResponse, error) {
	return api.DescribeDisks(request)
}

func GetImages(api ECSDescribeInstancesAPI, request *ecs.DescribeImagesRequest) (*ecs.DescribeImagesResponse, error) {
	return api.DescribeImages(request)
}

func TagResources(api ECSDescribeInstancesAPI, request *ecs.TagResourcesRequest) (*ecs.TagResourcesResponse, error) {
	return api.TagResources(request)
}

func (d Driver) getInstances(infra *v1.Infra, status string) ([]v1.Hosts, error) {
	var hosts []v1.Hosts
	hostmap := make(map[int]*v1.Hosts)

	if status == common.InstanceStatusRunning {
		status = ECSInstanceStatusNameRunning
	}
	client := d.ECSClient
	request := &ecs.DescribeInstancesRequest{
		RpcRequest: ecs.CreateDescribeInstancesRequest().RpcRequest,
		Status:     status,
		Tag: &[]ecs.DescribeInstancesTag{
			{
				Key:   common.InfraInstancesUUID,
				Value: string(infra.UID),
			},
		},
		ResourceGroupId: d.ResourceGroupID,
	}
	response, err := GetInstances(client, request)
	if err != nil {
		return nil, fmt.Errorf("got an error retrieving information about your Aliyun ECS instances: %v", err)
	}

	for _, i := range response.Instances.Instance {
		logger.Info("get instance id: %v", i.InstanceId)
		if infra.Spec.SSH.PkName == "" {
			infra.Spec.SSH.PkName = i.KeyPairName
		}

		if i.Status != status {
			logger.Warn("instance is not running, skip it", "instance", i.InstanceId, i.Status)
			continue
		}
		index, err := getIndex(i)
		if err != nil {
			return nil, fmt.Errorf("aws ecs not found index label: %v", err)
		}
		if infra.Spec.AvailabilityZone == "" {
			availabilityZone := i.ZoneId
			infra.Spec.AvailabilityZone = availabilityZone
		}

		metadata := v1.Metadata{
			IP:     []v1.IPAddress{{IPType: common.IPTypePrivate, IPValue: i.VpcAttributes.PrivateIpAddress.IpAddress[0]}, {IPType: common.IPTypePublic, IPValue: i.PublicIpAddress.IpAddress[0]}},
			ID:     i.InstanceId,
			Status: i.Status,
		}

		for _, tag := range i.Tags.Tag {
			if tag.TagKey == common.MasterO {
				metadata.Labels = make(map[string]string)
				metadata.Labels[common.MasterO] = tag.TagValue
			}
		}

		// get disks of instance
		var disks []v1.Disk
		diskRequest := &ecs.DescribeDisksRequest{
			RpcRequest:      ecs.CreateDescribeDisksRequest().RpcRequest,
			InstanceId:      i.InstanceId,
			ResourceGroupId: d.ResourceGroupID,
		}
		diskResponse, err := GetDisks(client, diskRequest)
		if err != nil {
			logger.Warn("Get volumes failed", "instance", i.InstanceId)
		}
		for _, disk := range diskResponse.Disks.Disk {
			vid := disk.DiskId
			metadata.DiskID = append(metadata.DiskID, vid)
			var diskType string
			// judge the diskType
			if disk.Type == systemDiskType {
				diskType = common.RootVolumeLabel
			} else {
				diskType = common.DataVolumeLabel
			}
			disks = append(disks, v1.Disk{
				Capacity:   disk.Size,
				VolumeType: disk.Category,
				Type:       diskType,
				ID:         []string{vid},
				Device:     disk.Device,
			})
		}
		if h, ok := hostmap[index]; ok {
			h.Count++
			hostmap[index].Metadata = append(hostmap[index].Metadata, metadata)
			mergeDisks(&hostmap[index].Disks, &disks)
			continue
		}
		instanceType, imageID := i.InstanceType, i.ImageId
		arch, _ := d.getArchFromImageID(imageID)

		hostmap[index] = &v1.Hosts{
			Count:    1,
			Arch:     arch,
			Metadata: []v1.Metadata{metadata},
			Image:    imageID,
			Flavor:   instanceType,
			Index:    index,
			Disks:    disks,
		}

		for _, mp := range i.Tags.Tag {
			if mp.TagKey == v1beta1.MASTER {
				hostmap[index].Roles = append(hostmap[index].Roles, v1beta1.MASTER)
				break
			}
			if mp.TagKey == v1beta1.NODE {
				hostmap[index].Roles = append(hostmap[index].Roles, v1beta1.NODE)
				break
			}
		}
	}

	for _, v := range hostmap {
		hosts = append(hosts, *v)
	}

	err = d.setMaster0IfNotExists(&hosts)
	if err != nil {
		return nil, err
	}

	return hosts, nil
}

func getIndex(i ecs.Instance) (int, error) {
	for _, tag := range i.Tags.Tag {
		if tag.TagKey == common.InfraInstancesIndex {
			return strconv.Atoi(tag.TagValue)
		}
	}
	return -1, fmt.Errorf("index tag not found: %v", i.Tags)
}

func (d Driver) getArchFromImageID(id string) (string, error) {
	describeImagesRequest := &ecs.DescribeImagesRequest{
		RpcRequest:      ecs.CreateDescribeImagesRequest().RpcRequest,
		ImageId:         id,
		ResourceGroupId: d.ResourceGroupID,
	}
	describeImageResponse, err := GetImages(d.ECSClient, describeImagesRequest)
	if err != nil {
		return "", err
	}
	if len(describeImageResponse.Images.Image) == 0 {
		return "", fmt.Errorf("image %v not found", id)
	}
	arch := common.ArchAmd64
	if describeImageResponse.Images.Image[0].Architecture == common.ArchArm64 {
		arch = common.ArchArm64
	}
	return arch, nil
}

func mergeDisks(curDisk *[]v1.Disk, newDisk *[]v1.Disk) {
	sort.Sort(v1.DeviceDisks(*newDisk))
	sort.Sort(v1.DeviceDisks(*curDisk))
	for i := range *curDisk {
		if (*newDisk)[i].Device == (*curDisk)[i].Device {
			(*curDisk)[i].ID = append((*curDisk)[i].ID, (*newDisk)[i].ID...)
		}
	}
}

func (d Driver) setMaster0IfNotExists(hosts *[]v1.Hosts) error {
	for _, h := range *hosts {
		for _, meta := range h.Metadata {
			if _, ok := meta.Labels[common.MasterO]; ok {
				return nil
			}
		}
	}
	for i := range *hosts {
		h := &(*hosts)[i]
		if len(h.Roles) > 0 && h.Roles[0] == v1beta1.MASTER {
			for j := range h.Metadata {
				label := make(map[string]string)
				label[common.MasterO] = common.TRUELable
				h.Metadata[j].Labels = label
				labelKey, labelValue := common.MasterO, common.TRUELable
				tagResourcesRequest := &ecs.TagResourcesRequest{
					RpcRequest:   ecs.CreateTagResourcesRequest().RpcRequest,
					ResourceType: resourceTypeInstance,
					ResourceId:   &[]string{h.Metadata[j].ID},
					Tag:          &[]ecs.TagResourcesTag{{Key: labelKey, Value: labelValue}},
				}
				_, err := TagResources(d.ECSClient, tagResourcesRequest)
				if err != nil {
					return fmt.Errorf("set master0 label failed: %v", err)
				}
				return nil
			}
		}
	}
	return nil
}
