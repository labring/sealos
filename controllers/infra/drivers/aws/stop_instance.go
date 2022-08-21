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
	disksID := make([]string, 0)
	for i := 0; i < hosts.Count; i++ {
		metadata := hosts.Metadata[i]
		instanceID[i] = metadata.ID
		disksID = append(disksID, metadata.DiskID...)
	}
	input := &ec2.StopInstancesInput{
		InstanceIds: instanceID,
	}
	terminateInput := &ec2.TerminateInstancesInput{
		InstanceIds: instanceID,
		DryRun:      aws.Bool(false),
	}
	if err := d.DeleteVolume(disksID); err != nil {
		return fmt.Errorf("aws stop instance failed(delete volume):, %v", err)
	}
	_, err := StopInstance(context.TODO(), client, input)
	if err != nil {
		return fmt.Errorf("aws stop instance failed: %s, %v", instanceID, err)
	}
	_, err = client.TerminateInstances(context.TODO(), terminateInput)
	if err != nil {
		return fmt.Errorf("aws terminate instance failed: %s, %v", instanceID, err)
	}

	return nil
}
