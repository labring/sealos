// Copyright © 2023 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package aws

import (
	"context"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/service/ec2"
)

// EC2DescribeAMIAPI defines the interface for the DescribeInstances function.
// We use this interface to test the function using a mocked service.
type EC2DescribeAMIAPI interface {
	DescribeImages(ctx context.Context,
		params *ec2.DescribeImagesInput,
		optFns ...func(*ec2.Options)) (*ec2.DescribeImagesOutput, error)
}

// GetImages retrieves information about your Amazon Elastic Compute Cloud (Amazon EC2) images.
// Inputs:
//
//	c is the context of the method call, which includes the AWS Region.
//	api is the interface that defines the method call.
//	input defines the input arguments to the service call.
//
// Output:
//
//	If success, a DescribeImagesOutput object containing the result of the service call and nil.
//	Otherwise, nil and an error from the call to DescribeImages.
func GetImages(c context.Context, api EC2DescribeAMIAPI, input *ec2.DescribeImagesInput) (*ec2.DescribeImagesOutput, error) {
	return api.DescribeImages(c, input)
}

// getImageRootDeviceNameByID get images root device name from image api
func (d Driver) getImageRootDeviceNameByID(amiID string) (rootDeviceName string, err error) {
	client := d.Client
	input := &ec2.DescribeImagesInput{
		ImageIds: []string{
			amiID,
		},
	}

	result, err := GetImages(context.TODO(), client, input)
	if err != nil {
		return "", err
	}
	if len(result.Images) == 0 {
		return "", fmt.Errorf("not find this image: %s", amiID)
	}
	if *result.Images[0].RootDeviceName == "" {
		return "", fmt.Errorf("this image: %s doesn't has a valid root device name", amiID)
	}
	return *result.Images[0].RootDeviceName, nil
}
