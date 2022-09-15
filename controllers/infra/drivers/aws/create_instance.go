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

	"github.com/labring/sealos/controllers/infra/common"

	v1 "github.com/labring/sealos/controllers/infra/api/v1"

	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
)

// EC2CreateInstanceAPI defines the interface for the RunInstances and CreateTags functions.
// We use this interface to test the functions using a mocked service.
type EC2CreateInstanceAPI interface {
	RunInstances(ctx context.Context,
		params *ec2.RunInstancesInput,
		optFns ...func(*ec2.Options)) (*ec2.RunInstancesOutput, error)

	CreateTags(ctx context.Context,
		params *ec2.CreateTagsInput,
		optFns ...func(*ec2.Options)) (*ec2.CreateTagsOutput, error)
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

func (d Driver) createInstances(hosts *v1.Hosts, infra *v1.Infra) error {
	client := d.Client
	var count = int32(hosts.Count)
	if count == 0 {
		return nil
	}
	// Tag name and tag value
	// Set role tag
	tags := rolesToTags(hosts.Roles)
	// Set label tag
	labelKey := common.InfraInstancesLabel
	labelValue := infra.GetInstancesAndVolumesTag()
	tags = append(tags, types.Tag{
		Key:   &labelKey,
		Value: &labelValue,
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
	volumeTags := rolesToTags(hosts.Roles)
	rootVolume, value := common.RootVolumeLabel, common.TRUELable
	volumeTags = append(volumeTags,
		types.Tag{
			Key:   &rootVolume,
			Value: &value,
		},
	)
	keyName := "hurz_key"
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
				Tags:         volumeTags,
			},
		},
		KeyName:          &keyName,
		SecurityGroupIds: []string{"sg-0476ffedb5ca3f816"},
		//BlockDeviceMappings: make([]types.BlockDeviceMapping, len(hosts.Disks)),
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
	for _, instance := range result.Instances {
		hosts.Metadata = append(hosts.Metadata, v1.Metadata{
			ID: *instance.InstanceId,
		})
	}
	if infra.Spec.AvailabilityZone == "" && len(result.Instances) > 0 {
		infra.Spec.AvailabilityZone = *result.Instances[0].Placement.AvailabilityZone
	}
	err = d.createAndAttachVolumes(infra, hosts, hosts.Disks)
	if err != nil {
		return fmt.Errorf("create and attach volumes failed: %v", err)
	}
	return nil
}
