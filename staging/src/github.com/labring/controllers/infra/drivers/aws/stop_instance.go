/*
Copyright 2022 labring.
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX - License - Identifier: Apache - 2.0

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
	"errors"
	"fmt"

	"github.com/labring/sealos/controllers/cluster/common"

	"golang.org/x/sync/errgroup"

	v1 "github.com/labring/sealos/controllers/infra/api/v1"
	"github.com/labring/sealos/controllers/infra/common/utils"
	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/aws/aws-sdk-go-v2/aws"

	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/smithy-go"
)

// EC2StopInstancesAPI defines the interface for the StopInstances function.
// We use this interface to test the function using a mocked service.
type EC2StopInstancesAPI interface {
	StopInstances(ctx context.Context,
		params *ec2.StopInstancesInput,
		optFns ...func(*ec2.Options)) (*ec2.StopInstancesOutput, error)
	DeleteKeyPair(ctx context.Context,
		params *ec2.DeleteKeyPairInput,
		optFns ...func(*ec2.Options)) (*ec2.DeleteKeyPairOutput, error)
	DescribeVolumes(ctx context.Context,
		params *ec2.DescribeVolumesInput,
		optFns ...func(*ec2.Options)) (*ec2.DescribeVolumesOutput, error)
}

func GetVolume(c context.Context, api EC2DescribeVolumesAPI, input *ec2.DescribeVolumesInput) (*ec2.DescribeVolumesOutput, error) {
	return api.DescribeVolumes(c, input)
}

// StopInstance stops an Amazon Elastic Compute Cloud (Amazon EC2) instance.
// Inputs:
//
//	c is the context of the method call, which includes the AWS Region.
//	api is the interface that defines the method call.
//	input defines the input arguments to the service call.
//
// Output:
//
//	If success, a StopInstancesOutput object containing the result of the service call and nil.
//	Otherwise, nil and an error from the call to StopInstances.
func StopInstance(c context.Context, api EC2StopInstancesAPI, input *ec2.StopInstancesInput) (*ec2.StopInstancesOutput, error) {
	resp, err := api.StopInstances(c, input)

	var apiErr smithy.APIError
	if errors.As(err, &apiErr) && apiErr.ErrorCode() == "DryRunOperation" {
		fmt.Println("User has permission to stop instances.")
		input.DryRun = aws.Bool(false)
		return api.StopInstances(c, input)
	}

	return resp, err
}

func (d Driver) stopInstances(hosts *v1.Hosts) error {
	client := d.Client
	instanceID := make([]string, len(hosts.Metadata))
	for i, metadata := range hosts.Metadata {
		instanceID[i] = metadata.ID
	}

	input := &ec2.StopInstancesInput{
		InstanceIds: instanceID,
	}
	_, err := StopInstance(context.TODO(), client, input)
	if err != nil {
		return fmt.Errorf("aws stop instance failed: %s, %v", instanceID, err)
	}
	return nil
}

func (d Driver) deleteInstances(hosts *v1.Hosts) error {
	return d.deleteInstancesByOption(hosts, false)
}

func (d Driver) deleteInstancesByOption(hosts *v1.Hosts, deleteAll bool) error {
	client := d.Client
	instanceID := make([]string, hosts.Count)
	var disksIDs []string
	rootDeviceName, err := d.getImageRootDeviceNameByID(hosts.Image)
	if err != nil {
		return fmt.Errorf("aws delete disks failed(get root device name):, %v", err)
	}
	idx := 0
	for i := 0; i < hosts.Count; i++ {
		if len(hosts.Metadata) == 0 {
			return nil
		}
		metadata := hosts.Metadata[idx]
		// if deleteAll is false, skip master0
		if _, ok := metadata.Labels[common.Master0Label]; ok && !deleteAll {
			idx++
			i--
			continue
		}
		// skip root disk
		for _, disksID := range metadata.DiskID {
			getDiskInput := &ec2.DescribeVolumesInput{
				VolumeIds: []string{disksID},
			}
			volume, err := GetVolume(context.TODO(), client, getDiskInput)
			if err != nil || len(volume.Volumes) == 0 {
				return fmt.Errorf("failed to get volume: %s, %v", disksID, err)
			}
			if *volume.Volumes[0].Attachments[0].Device != rootDeviceName {
				disksIDs = append(disksIDs, disksID)
			}
		}
		instanceID[i] = metadata.ID
		idx++
	}
	if err := d.DeleteVolume(disksIDs); err != nil {
		return fmt.Errorf("aws stop instance failed(delete volume):, %v", err)
	}

	// first query for the instance status that can be stopped
	describeInputStatus := &ec2.DescribeInstanceStatusInput{
		InstanceIds: instanceID,
	}
	ins, err := GetInstanceStatus(context.TODO(), client, describeInputStatus)
	if err != nil {
		//todo
		return fmt.Errorf("aws get instance status failed: %s, %v", instanceID, err)
	}
	if len(ins.InstanceStatuses) == 0 {
		logger.Info("can't get any instance status, no need to delete...")
		return nil
	}
	for _, instanceStatus := range ins.InstanceStatuses {
		logger.Info("Deleting instance %s: from status: %s\n", *instanceStatus.InstanceId, instanceStatus.InstanceState.Name)
		if instanceStatus.InstanceState.Name == "stopped" || instanceStatus.InstanceState.Name == "stopping" {
			instanceID = utils.RemoveString(instanceID, *instanceStatus.InstanceId)
		}
	}
	input := &ec2.StopInstancesInput{
		InstanceIds: instanceID,
	}
	_, err = StopInstance(context.TODO(), client, input)
	if err != nil {
		return fmt.Errorf("aws stop instance failed: %s, %v", instanceID, err)
	}
	for _, instanceStatus := range ins.InstanceStatuses {
		if instanceStatus.InstanceState.Name == "terminated" {
			instanceID = utils.RemoveString(instanceID, *instanceStatus.InstanceId)
		}
	}
	terminateInput := &ec2.TerminateInstancesInput{
		InstanceIds: instanceID,
		DryRun:      aws.Bool(false),
	}
	_, err = client.TerminateInstances(context.TODO(), terminateInput)
	if err != nil {
		return fmt.Errorf("aws terminate instance failed: %s, %v", instanceID, err)
	}

	return nil
}

func (d Driver) deleteInfra(infra *v1.Infra) error {
	eg, _ := errgroup.WithContext(context.Background())
	logger.Info("delete instances of infra %s", infra.Name)
	for i := range infra.Spec.Hosts {
		host := infra.Spec.Hosts[i]
		eg.Go(func() error {
			return d.deleteInstancesByOption(&host, true)
		})
	}
	if err := eg.Wait(); err != nil {
		return fmt.Errorf("delete instances error:%v", err)
	}
	logger.Info("delete key pair of infra %s", infra.Name)
	if err := d.deleteKeyPair(infra); err != nil {
		return fmt.Errorf("delete key pair error:%v", err)
	}
	return nil
}

func DelKeyPair(c context.Context, api EC2StopInstancesAPI, input *ec2.DeleteKeyPairInput) (*ec2.DeleteKeyPairOutput, error) {
	return api.DeleteKeyPair(c, input)
}

func (d Driver) deleteKeyPair(infra *v1.Infra) error {
	if infra.Spec.SSH.PkName == "" {
		return nil
	}

	mutex.Lock()
	defer mutex.Unlock()
	client := d.Client
	input := &ec2.DeleteKeyPairInput{
		KeyName: &infra.Spec.SSH.PkName,
	}

	_, err := DelKeyPair(context.TODO(), client, input)
	if err != nil {
		return fmt.Errorf("delete key pair error:%v", err)
	}
	logger.Info("delete key pair success", "keyName", *input.KeyName)
	return nil
}
