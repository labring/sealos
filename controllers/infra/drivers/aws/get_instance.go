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
func (d Driver) getInstances(infra *v1.Infra, status types.InstanceStateName) ([]v1.Hosts, error) {
	var hosts []v1.Hosts
	hostmap := make(map[int]*v1.Hosts)
	uidKey := fmt.Sprintf("tag:%s", common.InfraInstancesUUID)
	statusName := "instance-state-name"

	client := d.Client
	input := &ec2.DescribeInstancesInput{
		Filters: []types.Filter{
			{
				Name:   &uidKey,
				Values: []string{string(infra.UID)},
			},
			{
				Name:   &statusName,
				Values: []string{string(status)},
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
			// append diskID to metadata
			for _, blockDeviceMap := range i.BlockDeviceMappings {
				vid := *blockDeviceMap.Ebs.VolumeId
				metadata.DiskID = append(metadata.DiskID, vid)
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
				Image:    *imageID,
				Flavor:   string(instanceType),
				Index:    index,
				Disks:    infra.Spec.Hosts[index].Disks, // TODO: get disks from instance
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
	return hosts, nil
}

// createDisks assign disk(all mount paths) to host for the first time
//func setDisks(host *v1.Hosts, diskMap map[string]v1.Disk, instance types.Instance) {
//	for j := range instance.BlockDeviceMappings {
//		volumeID := *instance.BlockDeviceMappings[j].Ebs.VolumeId
//		if v, ok := diskMap[volumeID]; ok {
//			host.Disks = append(host.Disks,
//				v1.Disk{
//					// ID:       []string{volumeID},
//					Name:     *instance.BlockDeviceMappings[j].DeviceName,
//					Capacity: v.Capacity,
//					Type:     v.Type,
//				},
//			)
//		}
//	}
//}

// addDisks add the mount volumeID to each mount path
//func addDisks(host *v1.Hosts, diskMap map[string]v1.Disk, instance types.Instance) error {
//	for _, blockDeviceMap := range instance.BlockDeviceMappings {
//		if _, ok := diskMap[*blockDeviceMap.Ebs.VolumeId]; !ok {
//			continue
//		}
//		//search disk index in host by name
//		diskIndex := sort.Search(len(host.Disks), func(i int) bool {
//			return host.Disks[i].Name >= *blockDeviceMap.DeviceName
//		})
//		if diskIndex < 0 || diskIndex >= len(host.Disks) {
//			return fmt.Errorf("get aws disk error, disk not found. disk name: %s, instance id:%s", *blockDeviceMap.DeviceName, *instance.InstanceId)
//		}
//		// host.Disks[diskIndex].ID = append(host.Disks[diskIndex].ID, *blockDeviceMap.Ebs.VolumeId)
//	}
//	return nil
//}

// getVolumes get an infra owned volumes(by dataKey and infra label), return diskMap map[string(id)]v1.Disk.
//func (d Driver) getVolumes(infra *v1.Infra) (map[string]v1.Disk, error) {
//	client := d.Client
//	tagKey := fmt.Sprintf("tag:%s", common.DataVolumeLabel)
//	//roleKey := fmt.Sprintf("tag:%s", roles)
//	nameKey := fmt.Sprintf("tag:%s", common.InfraVolumesLabel)
//	fullName := infra.GetInstancesAndVolumesTag()
//	input := &ec2.DescribeVolumesInput{
//		Filters: []types.Filter{
//			{
//				Name:   &nameKey,
//				Values: []string{fullName},
//			},
//			{
//				Name:   &tagKey,
//				Values: []string{common.TRUELable},
//			},
//		},
//	}
//	result, err := client.DescribeVolumes(context.TODO(), input)
//	if err != nil {
//		return nil, fmt.Errorf("got an error retrieving information about your Amazon EC2 volumes: %v", err)
//	}
//	diskMap := make(map[string]v1.Disk, len(result.Volumes))
//	for _, v := range result.Volumes {
//		diskMap[*v.VolumeId] = v1.Disk{
//			Capacity: int(*v.Size),
//			Type:     string(v.VolumeType),
//		}
//	}
//	return diskMap, nil
//}

//func sortDisksByName(disks v1.NameDisks) {
//	sort.Sort(disks)
//}

func getIndex(i types.Instance) (int, error) {
	for _, tag := range i.Tags {
		if *tag.Key == common.InfraInstancesIndex {
			return strconv.Atoi(*tag.Value)
		}
	}
	return -1, fmt.Errorf("not found index tag: %v", i.Tags)
}

//func retryGetInstance(tryTimes int, trySleepTime time.Duration, client *ec2.Client, inputGetInstance *ec2.DescribeInstancesInput) (*ec2.DescribeInstancesOutput, error) {
//retry:
//	for i := 0; i < tryTimes; i++ {
//		result, err := GetInstances(context.TODO(), client, inputGetInstance)
//		if err != nil {
//			return nil, fmt.Errorf("get an error while getInstances: %v", err)
//		}
//		for _, r := range result.Reservations {
//			if !instancesPublicIPAddressIsReady(r.Instances) {
//				if i == tryTimes-1 {
//					break retry
//				}
//				time.Sleep(trySleepTime * time.Duration(math.Pow(2, float64(i))))
//				continue retry
//			}
//		}
//		return result, nil
//	}
//	return nil, fmt.Errorf("retry get instance action timeout: no public ip")
//}

//func instancesPublicIPAddressIsReady(instances []types.Instance) bool {
//	for j := range instances {
//		if *instances[j].State.Code == 0 || *instances[j].State.Code == 16 {
//			if instances[j].PublicIpAddress == nil {
//				return false
//			}
//		}
//	}
//	return true
//}
