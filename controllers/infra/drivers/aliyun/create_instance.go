package aliyun

import (
	"fmt"
	"strconv"
	"time"

	"github.com/labring/sealos/pkg/utils/retry"

	"github.com/aliyun/alibaba-cloud-sdk-go/sdk/requests"

	"github.com/aliyun/alibaba-cloud-sdk-go/services/ecs"
	v1 "github.com/labring/sealos/controllers/infra/api/v1"
	"github.com/labring/sealos/controllers/infra/common"
)

type ECSCreateInstancesAPI interface {
	RunInstances(request *ecs.RunInstancesRequest) (response *ecs.RunInstancesResponse, err error)
	TagResources(requests *ecs.TagResourcesRequest) (response *ecs.TagResourcesResponse, err error)
}

func MakeInstances(api ECSCreateInstancesAPI, request *ecs.RunInstancesRequest) (*ecs.RunInstancesResponse, error) {
	return api.RunInstances(request)
}

func MakeTags(api ECSCreateInstancesAPI, request *ecs.TagResourcesRequest) (*ecs.TagResourcesResponse, error) {
	return api.TagResources(request)
}

func (d Driver) createInstances(hosts *v1.Hosts, infra *v1.Infra) error {
	client := d.Client
	if hosts.Count == 0 {
		return nil
	}
	tags := getTags(hosts, infra)
	keyName := infra.Spec.SSH.PkName
	if infra.Spec.AvailabilityZone == "" {
		infra.Spec.AvailabilityZone = defaultAvailabilityZone
	}

	// get root disk
	rootDiskVolumeType, rootDiskSize := getRootDisk(hosts)
	// get data disk
	dataDisks := getDataDisks(hosts)

	runInstanceRequest := &ecs.RunInstancesRequest{
		RpcRequest:              ecs.CreateRunInstancesRequest().RpcRequest,
		ZoneId:                  infra.Spec.AvailabilityZone,
		ImageId:                 hosts.Image,
		InstanceType:            hosts.Flavor,
		HostName:                infra.Name,
		UniqueSuffix:            "true",
		InternetMaxBandwidthOut: defaultInternetMaxBandwidthOut,
		Amount:                  requests.Integer(strconv.Itoa(hosts.Count)),
		Tag:                     &tags,
		SystemDiskCategory:      rootDiskVolumeType,
		SystemDiskSize:          strconv.Itoa(rootDiskSize),
		DataDisk:                &dataDisks,
		KeyPairName:             keyName,
		InstanceChargeType:      defaultInstanceChargeType,
		SecurityGroupId:         defaultSecurityGroupID,
		VSwitchId:               defaultVSwitchID,
	}
	runInstanceResponse, err := MakeInstances(client, runInstanceRequest)
	if err != nil {
		return fmt.Errorf("create instance failed: %v", err)
	}
	if err := d.waitInstancesRunning(&runInstanceResponse.InstanceIdSets.InstanceIdSet); err != nil {
		return fmt.Errorf("wait instance running failed: %v", err)
	}

	return nil
}

func rolesToTags(roles []string) (tags []ecs.RunInstancesTag) {
	t := common.TRUELable

	for _, r := range roles {
		tag := ecs.RunInstancesTag{
			Key:   r,
			Value: t,
		}

		tags = append(tags, tag)
	}
	return tags
}

// GetTags get tags
func getTags(hosts *v1.Hosts, infra *v1.Infra) []ecs.RunInstancesTag {
	// Tag name and tag value
	// Set role tag
	tags := rolesToTags(hosts.Roles)
	// Set label tag
	labelKey := common.InfraInstancesLabel
	labelValue := infra.GetInstancesAndVolumesTag()
	uidKey := common.InfraInstancesUUID
	uidValue := string(infra.GetUID())
	tags = append(tags, ecs.RunInstancesTag{
		Key:   labelKey,
		Value: labelValue,
	}, ecs.RunInstancesTag{
		Key:   uidKey,
		Value: uidValue,
	})
	// Set index tag
	indexKey := common.InfraInstancesIndex
	indexValue := strconv.Itoa(hosts.Index)
	tags = append(tags, ecs.RunInstancesTag{
		Key:   indexKey,
		Value: indexValue,
	})
	return tags
}

func getRootDisk(hosts *v1.Hosts) (rootDiskVolumeType string, rootDiskSize int) {
	for _, disk := range hosts.Disks {
		if disk.Type == common.RootVolumeLabel {
			return disk.VolumeType, disk.Capacity
		}
	}
	return defaultRootVolumeType, defaultRootVolumeSize
}

func getDataDisks(host *v1.Hosts) []ecs.RunInstancesDataDisk {
	var dataDisks []ecs.RunInstancesDataDisk
	for _, disk := range host.Disks {
		if disk.Type == common.RootVolumeLabel {
			continue
		}
		dataDisk := ecs.RunInstancesDataDisk{
			Size:     strconv.Itoa(disk.Capacity),
			Category: disk.VolumeType,
		}
		dataDisks = append(dataDisks, dataDisk)
	}
	return dataDisks
}

func (d Driver) waitInstancesRunning(instanceIDs *[]string) error {
	err := retry.Retry(30, 10*time.Second, func() error {
		describeInstanceStatusRequest := &ecs.DescribeInstanceStatusRequest{
			RpcRequest: ecs.CreateDescribeInstanceStatusRequest().RpcRequest,
			InstanceId: instanceIDs,
		}
		describeInstanceStatusResponse, err := GetInstanceStatus(d.Client, describeInstanceStatusRequest)
		if err != nil {
			return err
		}
		if len(describeInstanceStatusResponse.InstanceStatuses.InstanceStatus) == 0 && len(*instanceIDs) != 0 {
			return fmt.Errorf("get status failed")
		}
		for _, instanceStatus := range describeInstanceStatusResponse.InstanceStatuses.InstanceStatus {
			if instanceStatus.Status != "Running" {
				return fmt.Errorf("instance %s is not running", instanceStatus.InstanceId)
			}
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("retry time out: %v", err)
	}
	return nil
}
