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
	"math"
	"time"

	"golang.org/x/sync/errgroup"

	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/labring/sealos/controllers/infra/common"
)

type EC2DeleteVolumeAPI interface {
	DeleteVolume(ctx context.Context,
		params *ec2.DeleteVolumeInput,
		optFns ...func(*ec2.Options)) (*ec2.DeleteVolumeOutput, error)

	DetachVolume(ctx context.Context,
		params *ec2.DetachVolumeInput,
		optFns ...func(*ec2.Options)) (*ec2.DetachVolumeOutput, error)
}

func DeleteVolume(c context.Context, api EC2DeleteVolumeAPI, input *ec2.DeleteVolumeInput) (*ec2.DeleteVolumeOutput, error) {
	return api.DeleteVolume(c, input)
}

func DetachVolume(c context.Context, api EC2DeleteVolumeAPI, input *ec2.DetachVolumeInput) (*ec2.DetachVolumeOutput, error) {
	return api.DetachVolume(c, input)
}

func (d Driver) detachAndDeleteVolumeByID(disksID []string) error {
	client := d.Client
	eg, _ := errgroup.WithContext(context.Background())
	for _, id := range disksID {
		vid := id
		inputDetach := &ec2.DetachVolumeInput{
			VolumeId: &vid,
		}
		_, err := DetachVolume(context.TODO(), client, inputDetach)
		if err != nil {
			return fmt.Errorf("detach volume failed: %v,Volume Id is : %s", err, id)
		}
		inputDelete := &ec2.DeleteVolumeInput{
			VolumeId: &vid,
		}
		eg.Go(func() error {
			return retryDeleteVolume(common.TryTimes, common.TrySleepTime, client, inputDelete)
		})
	}
	return eg.Wait()
}

func retryDeleteVolume(tryTimes int, trySleepTime time.Duration, client *ec2.Client, inputDelete *ec2.DeleteVolumeInput) error {
	var err error
	for i := 0; i < tryTimes; i++ {
		_, err = DeleteVolume(context.TODO(), client, inputDelete)
		if err == nil {
			return nil
		}
		if i == tryTimes-1 {
			break
		}
		time.Sleep(trySleepTime * time.Duration(math.Pow(2, float64(i))))
	}
	return fmt.Errorf("retry delete volume action timeout:%v", err)
}
