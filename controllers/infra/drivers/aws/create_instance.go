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
	"encoding/base64"
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/google/uuid"

	"github.com/labring/sealos/controllers/infra/common"

	v1 "github.com/labring/sealos/controllers/infra/api/v1"

	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
)

var mutex sync.Mutex

var userData = `#!/bin/bash
sudo cp /home/ec2-user/.ssh/authorized_keys /root/.ssh/authorized_keys
sudo sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin yes/g' /etc/ssh/sshd_config
sudo sed -ie "s/no-port-for.*exit 142\" //g" /root/.ssh/authorized_keys
`

// EC2CreateInstanceAPI defines the interface for the RunInstances and CreateTags functions.
// We use this interface to test the functions using a mocked service.
type EC2CreateInstanceAPI interface {
	RunInstances(ctx context.Context,
		params *ec2.RunInstancesInput,
		optFns ...func(*ec2.Options)) (*ec2.RunInstancesOutput, error)

	CreateTags(ctx context.Context,
		params *ec2.CreateTagsInput,
		optFns ...func(*ec2.Options)) (*ec2.CreateTagsOutput, error)

	CreateKeyPair(ctx context.Context,
		params *ec2.CreateKeyPairInput,
		optFns ...func(*ec2.Options)) (*ec2.CreateKeyPairOutput, error)
}

// MakeInstance creates an Amazon Elastic Compute Cloud (Amazon EC2) instance.
// Inputs:
//
//	c is the context of the method call, which includes the AWS Region.
//	api is the interface that defines the method call.
//	input defines the input arguments to the service call.
//
// Output:
//
//	If success, a RunInstancesOutput object containing the result of the service call and nil.
//	Otherwise, nil and an error from the call to RunInstances.
func MakeInstance(c context.Context, api EC2CreateInstanceAPI, input *ec2.RunInstancesInput) (*ec2.RunInstancesOutput, error) {
	return api.RunInstances(c, input)
}

// MakeTags creates tags for an Amazon Elastic Compute Cloud (Amazon EC2) instance.
// Inputs:
//
//	c is the context of the method call, which includes the AWS Region.
//	api is the interface that defines the method call.
//	input defines the input arguments to the service call.
//
// Output:
//
//	If success, a CreateTagsOutput object containing the result of the service call and nil.
//	Otherwise, nil and an error from the call to CreateTags.
func MakeTags(c context.Context, api EC2CreateInstanceAPI, input *ec2.CreateTagsInput) (*ec2.CreateTagsOutput, error) {
	return api.CreateTags(c, input)
}

func MakeKeyPair(c context.Context, api EC2CreateInstanceAPI, input *ec2.CreateKeyPairInput) (*ec2.CreateKeyPairOutput, error) {
	return api.CreateKeyPair(c, input)
}

func GetInstanceType(hosts *v1.Hosts) types.InstanceType {
	// TODO search instance type by CPU and memory

	return types.InstanceType(hosts.Flavor)
}

func rolesToTags(roles []string) (tags []types.Tag) {
	t := common.TRUELable

	for _, r := range roles {
		tag := types.Tag{
			Key:   &r,
			Value: &t,
		}

		tags = append(tags, tag)
	}
	return tags
}

func checkHasSystemDisk(hosts *v1.Hosts) bool {
	var hasSystemDisk = false
	for _, v := range hosts.Disks {
		if strings.EqualFold(v.Type, common.RootVolumeLabel) {
			hasSystemDisk = true
		}
	}
	return hasSystemDisk
}

// generateDataDiskDeviceName according https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/device_naming.html#available-ec2-device-names
func generateDataDiskDeviceName(index int) (string, error) {
	var deviceSuffix = "bcdefghijklmnop"
	if index > len(deviceSuffix)-1 || index < 0 {
		return "", fmt.Errorf("device index is wrong that aws can't support, please check")
	}
	var deviceName = fmt.Sprintf("/dev/sd%s", string(deviceSuffix[index]))
	return deviceName, nil
}

// GetTags get tags
func (d Driver) GetTags(hosts *v1.Hosts, infra *v1.Infra) []types.Tag {
	// Tag name and tag value
	// Set role tag
	tags := rolesToTags(hosts.Roles)
	// Set label tag
	labelKey := common.InfraInstancesLabel
	labelValue := infra.GetInstancesAndVolumesTag()
	uidKey := common.InfraInstancesUUID
	uidValue := string(infra.GetUID())
	tags = append(tags, types.Tag{
		Key:   &labelKey,
		Value: &labelValue,
	}, types.Tag{
		Key:   &uidKey,
		Value: &uidValue,
	})
	// Set index tag
	indexKey := common.InfraInstancesIndex
	indexValue := strconv.Itoa(hosts.Index)
	tags = append(tags, types.Tag{
		Key:   &indexKey,
		Value: &indexValue,
	})
	// Set name tag
	nameKey := "Name"
	nameValue := fmt.Sprintf("%s-%d", labelValue, hosts.Index)
	tags = append(tags, types.Tag{
		Key:   &nameKey,
		Value: &nameValue,
	})
	return tags
}

// get instace data by id
func getInstancesByID(id *string, client *ec2.Client) ([]types.Reservation, error) {
	uidKey := fmt.Sprintf("tag:%s", common.InfraInstancesUUID)
	statusName := common.InstanceState
	status := types.InstanceStateNameRunning
	input := &ec2.DescribeInstancesInput{
		Filters: []types.Filter{
			{
				Name:   &uidKey,
				Values: []string{*id},
			},
			{
				Name:   &statusName,
				Values: []string{string(status)},
			},
		},
	}
	result, err := GetInstances(context.TODO(), client, input)
	if err != nil || len(result.Reservations) == 0 || len(result.Reservations[0].Instances) == 0 {
		return nil, fmt.Errorf("got an error retrieving information about your Amazon EC2 instances: %v", err)
	}
	return result.Reservations, nil
}

// GetBlockDeviceMappings generate blockDeviceMappings from hosts
func (d Driver) GetBlockDeviceMappings(hosts *v1.Hosts, rootDeviceName string, infra *v1.Infra) []types.BlockDeviceMapping {
	var blockDeviceMappings []types.BlockDeviceMapping
	hasSystem := checkHasSystemDisk(hosts)
	// if not specify a system disk, we add a default
	if !hasSystem {
		blockDeviceMappings = append(blockDeviceMappings, types.BlockDeviceMapping{
			DeviceName: &rootDeviceName,
			Ebs: &types.EbsBlockDevice{
				VolumeSize: &common.DefaultRootVolumeSize,
			},
		})
		// update infra disk info
		infra.Spec.Hosts[hosts.Index].Disks = append(infra.Spec.Hosts[hosts.Index].Disks, v1.Disk{
			Capacity: int(common.DefaultRootVolumeSize),
			Type:     common.RootVolumeLabel,
		})
	}
	systemAdded := false
	dataDiskIndex := 0
	for _, v := range hosts.Disks {
		var deviceName string
		if strings.EqualFold(v.Type, common.RootVolumeLabel) && !systemAdded {
			deviceName = rootDeviceName
			systemAdded = true
		} else {
			// should limit dataDiskNumbers here in crd check to avoid index error.
			deviceName, _ = generateDataDiskDeviceName(dataDiskIndex)
			dataDiskIndex++
		}

		size := int32(v.Capacity)
		bdm := types.BlockDeviceMapping{
			DeviceName: &deviceName,
			Ebs: &types.EbsBlockDevice{
				VolumeSize: &size,
				VolumeType: types.VolumeType(v.VolumeType),
			},
		}
		blockDeviceMappings = append(blockDeviceMappings, bdm)
	}

	return blockDeviceMappings
}

func (d Driver) createInstances(hosts *v1.Hosts, infra *v1.Infra) error {
	client := d.Client
	var count = int32(hosts.Count)
	if count == 0 {
		return nil
	}
	tags := d.GetTags(hosts, infra)
	roleTags := rolesToTags(hosts.Roles)
	keyName := infra.Spec.SSH.PkName
	availabilityZone := infra.Spec.AvailabilityZone
	// todo use ami to search root device name

	// encode userdata to base64
	userData := base64.StdEncoding.EncodeToString([]byte(userData))
	// set bdms, and read name and size from hosts

	rootDeviceName, err := d.getImageRootDeviceNameByID(hosts.Image)
	if err != nil {
		return err
	}
	bdms := d.GetBlockDeviceMappings(hosts, rootDeviceName, infra)
	input := &ec2.RunInstancesInput{
		ImageId:      &hosts.Image,
		InstanceType: GetInstanceType(hosts),
		MinCount:     &count,
		MaxCount:     &count,
		TagSpecifications: []types.TagSpecification{
			{
				ResourceType: types.ResourceTypeInstance,
				Tags:         tags,
			},
			{
				ResourceType: types.ResourceTypeVolume,
				Tags:         roleTags,
			},
		},
		KeyName:             &keyName,
		SecurityGroupIds:    []string{"sg-0476ffedb5ca3f816"},
		BlockDeviceMappings: bdms,
		Placement: &types.Placement{
			AvailabilityZone: &availabilityZone,
		},
		UserData: &userData,
	}

	// assign to BlockDeviceMappings from host.Disk
	//for i := range input.BlockDeviceMappings {
	//	name, size, volumeType := hosts.Disks[i].Name, int32(hosts.Disks[i].Capacity), hosts.Disks[i].Type
	//	input.BlockDeviceMappings[i].DeviceName = &name
	//	input.BlockDeviceMappings[i].Ebs = &types.EbsBlockDevice{
	//		VolumeSize: &size,
	//		VolumeType: types.VolumeType(volumeType),
	//	}
	//}
	result, err := MakeInstance(context.TODO(), client, input)
	if err != nil {
		return fmt.Errorf("create volume failed: %v", err)
	}

	if err := d.WaitInstanceRunning(result.Instances); err != nil {
		return fmt.Errorf("create instance and wait instance running failed: %v", err)
	}

	//set tag to volume
	diskIndex := 0
	//get BlockDeviceMapping
	id := string(infra.UID)
	reservations, err := getInstancesByID(&id, d.Client)
	if err != nil {
		return fmt.Errorf("get instance failed: %v", err)
	}
	for _, reservation := range reservations {
		for _, curInstance := range reservation.Instances {
			diskIndex = 0
			for _, blockDeviceMap := range curInstance.BlockDeviceMappings {
				vid := blockDeviceMap.Ebs.VolumeId
				indexKey, indexValue := common.InfraVolumeIndex, strconv.Itoa(diskIndex)
				infraIDKey, infraIDValue := common.VolumeInfraID, curInstance.InstanceId
				typeKey := common.DataVolumeLabel
				if *blockDeviceMap.DeviceName == rootDeviceName {
					typeKey = common.RootVolumeLabel
				}
				typeValue := common.TRUELable
				volumeTags := []types.Tag{
					{
						Key:   &infraIDKey,
						Value: infraIDValue,
					}, {
						Key:   &indexKey,
						Value: &indexValue,
					}, {
						Key:   &typeKey,
						Value: &typeValue,
					},
				}
				input := &ec2.CreateTagsInput{
					Resources: []string{*vid},
					Tags:      volumeTags,
				}
				if _, err := MakeTags(context.TODO(), client, input); err != nil {
					return fmt.Errorf("create volume tags failed: %v", err)
				}
				diskIndex++
			}
		}
	}
	//err = d.createAndAttachVolumes(infra, hosts, hosts.Disks)
	//if err != nil {
	//	return fmt.Errorf("create and attach volumes failed: %v", err)
	//}
	return nil
}

// WaitInstanceRunning retry for wait instance running
func (d Driver) WaitInstanceRunning(instances []types.Instance) error {
	client := d.Client
	var instanceIds []string
	for _, v := range instances {
		instanceIds = append(instanceIds, *v.InstanceId)
	}
	input := &ec2.DescribeInstancesInput{
		InstanceIds: instanceIds,
	}
	waiter := ec2.NewInstanceRunningWaiter(client)
	return waiter.Wait(context.TODO(), input, time.Second*180)
}

func (d Driver) CreateKeyPair(infra *v1.Infra) error {
	if infra.Spec.SSH.PkData != "" {
		return nil
	}

	mutex.Lock()
	defer mutex.Unlock()
	client := d.Client
	myUUID, err := uuid.NewUUID()
	if err != nil {
		return fmt.Errorf("create uuid error:%v", err)
	}
	keyName := myUUID.String()
	keypairKey, keypairValue := common.KeyPairUser, common.KeyPairGeneral
	keyTags := []types.Tag{
		{
			Key:   &keypairKey,
			Value: &keypairValue,
		},
	}
	input := &ec2.CreateKeyPairInput{
		KeyName:   &keyName,
		KeyFormat: types.KeyFormatPem,
		TagSpecifications: []types.TagSpecification{
			{
				ResourceType: types.ResourceTypeKeyPair,
				Tags:         keyTags,
			},
		},
	}

	result, err := MakeKeyPair(context.TODO(), client, input)
	if err != nil {
		return fmt.Errorf("create key pair error:%v", err)
	}
	infra.Spec.SSH.PkName = *result.KeyName
	infra.Spec.SSH.PkData = *result.KeyMaterial
	logger.Info("create key pair success", "keyName", *result.KeyName)
	return nil
}
