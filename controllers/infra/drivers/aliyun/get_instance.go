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

func GetInstanceStatus(api ECSDescribeInstancesAPI, request *ecs.DescribeInstanceStatusRequest) (*ecs.DescribeInstanceStatusResponse, error) {
	return api.DescribeInstanceStatus(request)
}

func (d Driver) getInstances(infra *v1.Infra, status string) ([]v1.Hosts, error) {
	var hosts []v1.Hosts
	hostmap := make(map[int]*v1.Hosts)

	if status == common.InstanceStatusRunning {
		status = ECSInstanceStatusNameRunning
	}
	client := d.Client
	request := &ecs.DescribeInstancesRequest{
		RpcRequest: ecs.CreateDescribeInstancesRequest().RpcRequest,
		Status:     status,
		Tag: &[]ecs.DescribeInstancesTag{
			{
				Key:   common.InfraInstancesUUID,
				Value: string(infra.UID),
			},
		},
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

		// get disks of instance
		var disks []v1.Disk
		diskRequest := &ecs.DescribeDisksRequest{
			RpcRequest: ecs.CreateDescribeDisksRequest().RpcRequest,
			InstanceId: i.InstanceId,
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
		RpcRequest: ecs.CreateDescribeImagesRequest().RpcRequest,
		ImageId:    id,
	}
	describeImageResponse, err := GetImages(d.Client, describeImagesRequest)
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
