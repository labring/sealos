/*
Copyright 2022 labring.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package aws

import (
	"context"
	"fmt"
	"sort"
	"strconv"

	"github.com/labring/sealos/pkg/types/v1beta1"

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/labring/sealos/controllers/infra/common"

	"github.com/aws/aws-sdk-go-v2/service/ec2/types"

	v1 "github.com/labring/sealos/controllers/infra/api/v1"

	"github.com/aws/aws-sdk-go-v2/service/ec2"
)

// EC2DescribeInstancesAPI defines the interface for the DescribeInstances function.
// We use this interface to test the function using a mocked service.
type EC2DescribeInstancesAPI interface {
	DescribeInstances(ctx context.Context,
		params *ec2.DescribeInstancesInput,
		optFns ...func(*ec2.Options)) (*ec2.DescribeInstancesOutput, error)
	DescribeInstanceStatus(ctx context.Context,
		params *ec2.DescribeInstanceStatusInput,
		optFns ...func(*ec2.Options)) (*ec2.DescribeInstanceStatusOutput, error)
	CreateTags(ctx context.Context,
		params *ec2.CreateTagsInput,
		optFns ...func(*ec2.Options)) (*ec2.CreateTagsOutput, error)
}

// GetInstanceStatus retrieves information about your Amazon Elastic Compute Cloud (Amazon EC2) instances.
// Inputs:
//
//	c is the context of the method call, which includes the AWS Region.
//	api is the interface that defines the method call.
//	input defines the input arguments to the service call.
//
// Output:
//
//	If success, a DescribeInstancesOutput object containing the result of the service call and nil.
//	Otherwise, nil and an error from the call to DescribeInstances.
func GetInstanceStatus(c context.Context, api EC2DescribeInstancesAPI, input *ec2.DescribeInstanceStatusInput) (*ec2.DescribeInstanceStatusOutput, error) {
	return api.DescribeInstanceStatus(c, input)
}

// GetInstances retrieves information about your Amazon Elastic Compute Cloud (Amazon EC2) instances.
// Inputs:
//
//	c is the context of the method call, which includes the AWS Region.
//	api is the interface that defines the method call.
//	input defines the input arguments to the service call.
//
// Output:
//
//	If success, a DescribeInstancesOutput object containing the result of the service call and nil.
//	Otherwise, nil and an error from the call to DescribeInstances.
func GetInstances(c context.Context, api EC2DescribeInstancesAPI, input *ec2.DescribeInstancesInput) (*ec2.DescribeInstancesOutput, error) {
	return api.DescribeInstances(c, input)
}

func CreateTags(c context.Context, api EC2DescribeInstancesAPI, input *ec2.CreateTagsInput) (*ec2.CreateTagsOutput, error) {
	return api.CreateTags(c, input)
}

/*
func ReconcileInstance(infra *v1.Infra) (*v1beta1.Cluster, error) {
	fmt.Println("access key id is: ", os.Getenv("AWS_DEFAULT_REGION"), os.Getenv("AWS_ACCESS_KEY_ID"))
	if len(infra.Spec.Hosts) == 0 {
		logger.Debug("desired host len is 0")
		return nil, nil
	}

	tag := infra.GetInstancesTag()
	instances, err := GetInstancesByLabel(common.InfraInstancesLabel, tag)
	if err != nil {
		return nil, fmt.Errorf("failed to query instances: %v", err)
	}

	// TODO create instances
	// if len(instances) == 0 {
	// }

	for _, i := range instances {
		if err := checkInstanceTags(i.Tags, common.InfraInstancesLabel, tag); err != nil {
			return nil, fmt.Errorf("instance not contains infra label: %s, %v, %v", *i.InstanceId, i.Tags, err)
		}
	}

	return nil, nil
}

func checkInstanceTags(tags []types.Tag, key, value string) error {
	// TODO check tags contain key, value, if not return an error

	return nil
}
*/

/*
Use this to uniquely identify which cluster the virtual machine belongs to

	key=infra.sealos.io/instances/label
	value=[namespace]/[infra name]

For example:

	apiVersion: infra.sealos.io/v1
	kind: Infra
	metadata:
	  name: aws-infra-demo
	  namespace: default

The value should be: default/aws-infra-demo
*/
func (d Driver) getInstancesByLabel(key string, value string, infra *v1.Infra) (*v1.Hosts, error) {
	hosts := &v1.Hosts{}
	nameKey := fmt.Sprintf("tag:%s", common.InfraInstancesLabel)
	fullName := infra.GetInstancesAndVolumesTag()

	roleKey := fmt.Sprintf("tag:%s", key)

	client := d.Client
	input := &ec2.DescribeInstancesInput{
		Filters: []types.Filter{
			{
				Name:   &nameKey,
				Values: []string{fullName},
			},
			{
				Name:   &roleKey,
				Values: []string{value},
			},
		},
	}

	result, err := GetInstances(context.TODO(), client, input)
	if err != nil {
		return nil, fmt.Errorf("got an error retrieving information about your Amazon EC2 instances: %v", err)
	}

	for _, r := range result.Reservations {
		for _, i := range r.Instances {
			if i.State.Name == types.InstanceStateNameTerminated || i.State.Name == types.InstanceStateNameShuttingDown {
				continue
			}
			hosts.Count++
			metadata := v1.Metadata{
				IP: []v1.IPAddress{{IPType: common.IPTypePrivate, IPValue: *i.PrivateIpAddress}, {IPType: common.IPTypePublic, IPValue: *i.PublicIpAddress}},
				ID: *i.InstanceId,
			}
			hosts.Metadata = append(hosts.Metadata, metadata)

			fmt.Printf("got instance id: %v, tags: %v, ip: %v, Eip: %v",
				i.InstanceId, i.Tags, i.PrivateIpAddress, i.PublicIpAddress)
		}
	}

	return hosts, nil
}

// getInstances get all instances for an infra
func (d Driver) getInstances(infra *v1.Infra, status string) ([]v1.Hosts, error) {
	var hosts []v1.Hosts
	hostmap := make(map[int]*v1.Hosts)
	uidKey := fmt.Sprintf("tag:%s", common.InfraInstancesUUID)
	statusName := common.InstanceState

	client := d.Client
	input := &ec2.DescribeInstancesInput{
		Filters: []types.Filter{
			{
				Name:   &uidKey,
				Values: []string{string(infra.UID)},
			},
			{
				Name:   &statusName,
				Values: []string{status},
			},
		},
	}

	result, err := GetInstances(context.TODO(), client, input)
	if err != nil {
		return nil, fmt.Errorf("got an error retrieving information about your Amazon EC2 instances: %v", err)
	}

	for _, r := range result.Reservations {
		for j := range r.Instances {
			i := r.Instances[j]
			logger.Info("get instance id: %v", *i.InstanceId)

			if i.State.Name != types.InstanceStateNameRunning {
				logger.Warn("instance is not running, skip it", "instance", i.InstanceId)
				continue
			}
			index, err := getIndex(i)
			if err != nil {
				return nil, fmt.Errorf("aws ecs not found index label: %v", err)
			}
			if infra.Spec.AvailabilityZone == "" {
				availabilityZone := i.Placement.AvailabilityZone
				infra.Spec.AvailabilityZone = *availabilityZone
			}
			metadata := v1.Metadata{
				IP:     []v1.IPAddress{{IPType: common.IPTypePrivate, IPValue: *i.PrivateIpAddress}, {IPType: common.IPTypePublic, IPValue: *i.PublicIpAddress}},
				ID:     *i.InstanceId,
				Status: string(i.State.Name),
			}

			for _, tag := range i.Tags {
				if *tag.Key == common.MasterO {
					metadata.Labels = make(map[string]string)
					metadata.Labels[common.MasterO] = *tag.Value
				}
			}

			// append diskID to metadata
			for _, blockDeviceMap := range i.BlockDeviceMappings {
				vid := *blockDeviceMap.Ebs.VolumeId
				metadata.DiskID = append(metadata.DiskID, vid)
			}

			// get disk from ec2
			var disks []v1.Disk
			volsInput := &ec2.DescribeVolumesInput{
				VolumeIds: metadata.DiskID,
			}
			volumes, err := GetVolumes(context.TODO(), client, volsInput)
			if err != nil {
				logger.Warn("Get Volumes Failed", "instance", i.InstanceId)
			}
			rootDeviceName := *i.RootDeviceName
			if volumes != nil {
				for _, vol := range volumes.Volumes {
					var diskType string
					// judge the diskType according the attachments
					for _, attachment := range vol.Attachments {
						if *attachment.Device == rootDeviceName {
							diskType = common.RootVolumeLabel
							break
						}
						diskType = common.DataVolumeLabel
						break
					}
					if len(vol.Attachments) == 0 {
						return nil, fmt.Errorf("aws ec2 volume %v has no attachments", *vol.VolumeId)
					}
					disks = append(disks, v1.Disk{
						Capacity:   int(*vol.Size),
						VolumeType: string(vol.VolumeType),
						Type:       diskType,
						ID:         []string{*vol.VolumeId},
						Device:     *vol.Attachments[0].Device,
					})
				}
			}
			if h, ok := hostmap[index]; ok {
				h.Count++
				hostmap[index].Metadata = append(hostmap[index].Metadata, metadata)
				mergeDisks(&hostmap[index].Disks, &disks)
				continue
			}
			instanceType, imageID := i.InstanceType, i.ImageId
			arch := getInstanceArch(i)

			hostmap[index] = &v1.Hosts{
				Count:    1,
				Arch:     arch,
				Metadata: []v1.Metadata{metadata},
				Image:    *imageID,
				Flavor:   string(instanceType),
				Index:    index,
				Disks:    disks,
			}

			for _, mp := range i.Tags {
				if *mp.Key == v1beta1.MASTER {
					hostmap[index].Roles = append(hostmap[index].Roles, v1beta1.MASTER)
					break
				}
				if *mp.Key == v1beta1.NODE {
					hostmap[index].Roles = append(hostmap[index].Roles, v1beta1.NODE)
					break
				}
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

func getInstanceArch(i types.Instance) string {
	arch := common.ArchAmd64
	if i.Architecture == common.ArchArm64 {
		arch = common.ArchArm64
	}
	return arch
}

func getIndex(i types.Instance) (int, error) {
	for _, tag := range i.Tags {
		if *tag.Key == common.InfraInstancesIndex {
			return strconv.Atoi(*tag.Value)
		}
	}
	return -1, fmt.Errorf("not found index tag: %v", i.Tags)
}

func mergeDisks(curDisk *[]v1.Disk, newDisk *[]v1.Disk) {
	if len(*newDisk) == 0 {
		return
	}
	sort.Sort(v1.DeviceDisks(*newDisk))
	sort.Sort(v1.DeviceDisks(*curDisk))
	for i := range *newDisk {
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
				createTagsInput := &ec2.CreateTagsInput{
					Resources: []string{h.Metadata[j].ID},
					Tags: []types.Tag{
						{
							Key:   &labelKey,
							Value: &labelValue,
						},
					},
				}
				_, err := CreateTags(context.TODO(), d.Client, createTagsInput)
				if err != nil {
					return fmt.Errorf("create tags failed: %v", err)
				}
				return nil
			}
		}
	}
	return nil
}
