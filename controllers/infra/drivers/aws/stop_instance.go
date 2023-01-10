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
	client := d.Client
	instanceID := make([]string, hosts.Count)
	for i := 0; i < hosts.Count; i++ {
		if len(hosts.Metadata) == 0 {
			return nil
		}
		metadata := hosts.Metadata[i]
		instanceID[i] = metadata.ID
	}

	//if err := d.DeleteVolume(disksID); err != nil {
	//	return fmt.Errorf("aws stop instance failed(delete volume):, %v", err)
	//}

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
