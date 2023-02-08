package aliyun

import (
	"fmt"
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

func (d Driver) getInstances(infra *v1.Infra, status string) ([]v1.Hosts, error) {
	var hosts []v1.Hosts
	hostmap := make(map[int]*v1.Hosts)

	client := d.Client
	request := &ecs.DescribeInstancesRequest{
		Status: status,
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
			logger.Warn("instance is not running, skip it", "instance", i.InstanceId)
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
			IP:     []v1.IPAddress{{IPType: common.IPTypePrivate, IPValue: i.IntranetIp}, {IPType: common.IPTypePublic, IPValue: i.InternetIp}},
			ID:     i.InstanceId,
			Status: i.Status,
		}

		// get disks of instance
		var disks []v1.Disk
		diskRequest := &ecs.DescribeDisksRequest{
			InstanceId: i.InstanceId,
		}
		diskResponse, err := GetDisks(client, diskRequest)
		if err != nil {
			logger.Warn("Get volumes failed", "instance", i.InstanceId)
		}
		// get root device name
		rootDeviceName, err := d.getRootDeviceNameByImageID(i.ImageId)
		if err != nil {
			logger.Warn("Get root device name faied", "instance", i.InstanceId)
		}
		for _, disk := range diskResponse.Disks.Disk {
			vid := disk.DiskId
			metadata.DiskID = append(metadata.DiskID, vid)
			var diskType string
			// judge the diskType
			if disk.Device == rootDeviceName {
				diskType = common.RootVolumeLabel
			} else {
				diskType = common.DataVolumeLabel
			}
			volIndex, err := getVolumeIndex(disk)
			if err != nil {
				return nil, fmt.Errorf("aliyun ecs volume index label not found: %v", err)
			}
			disks = append(disks, v1.Disk{
				Capacity:   disk.Size,
				VolumeType: disk.Category,
				Type:       diskType,
				ID:         disk.DiskId,
				Index:      volIndex,
			})
		}
		if h, ok := hostmap[index]; ok {
			h.Count++
			hostmap[index].Metadata = append(hostmap[index].Metadata, metadata)
			continue
		}
		instanceType, imageID := i.InstanceType, i.ImageId
		hostmap[index] = &v1.Hosts{
			Count:    1,
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

func getVolumeIndex(v ecs.Disk) (int, error) {
	for _, tag := range v.Tags.Tag {
		if tag.TagKey == common.InfraVolumeIndex {
			return strconv.Atoi(tag.TagValue)
		}
	}
	return -1, fmt.Errorf("volume index not found: %v", v.DiskId)
}

func (d Driver) getRootDeviceNameByImageID(id string) (string, error) {
	imageRequest := &ecs.DescribeImagesRequest{
		ImageId: id,
	}
	imageResponse, err := GetImages(d.Client, imageRequest)
	if err != nil {
		return "", err
	}
	if len(imageResponse.Images.Image) == 0 {
		return "", fmt.Errorf("image %v not found", id)
	}
	diskDeviceMappings := imageResponse.Images.Image[0].DiskDeviceMappings.DiskDeviceMapping
	for _, ddm := range diskDeviceMappings {
		if ddm.Type == "system" {
			return ddm.Device, nil
		}
	}
	return "", fmt.Errorf("system device not found")
}
