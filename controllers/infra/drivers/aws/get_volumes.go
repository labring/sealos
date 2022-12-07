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

	"github.com/aws/aws-sdk-go-v2/service/ec2"
)

// EC2DescribeVolumesAPI defines the interface for the DescribeVolumes function.
// We use this interface to test the function using a mocked service.
type EC2DescribeVolumesAPI interface {
	DescribeVolumes(ctx context.Context,
		params *ec2.DescribeVolumesInput,
		optFns ...func(*ec2.Options)) (*ec2.DescribeVolumesOutput, error)
}

// GetVolumes retrieves volumes information about your Amazon Elastic Compute Cloud (Amazon EC2) instances.
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
func GetVolumes(c context.Context, api EC2DescribeVolumesAPI, input *ec2.DescribeVolumesInput) (*ec2.DescribeVolumesOutput, error) {
	return api.DescribeVolumes(c, input)
}
