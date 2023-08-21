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

	"golang.org/x/sync/errgroup"

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/aws/aws-sdk-go-v2/service/ec2/types"

	v1 "github.com/labring/sealos/controllers/infra/api/v1"

	"github.com/aws/aws-sdk-go-v2/service/ec2"
)

type EC2ModifyVolumeAPI interface {
	ModifyVolume(ctx context.Context,
		params *ec2.ModifyVolumeInput,
		optFns ...func(*ec2.Options)) (*ec2.ModifyVolumeOutput, error)
}

func ModifyVolume(c context.Context, api EC2ModifyVolumeAPI, input *ec2.ModifyVolumeInput) (*ec2.ModifyVolumeOutput, error) {
	return api.ModifyVolume(c, input)
}

// can't modify type when disk being used. can't smaller size when disk being used.
func (d Driver) modifyVolumes(curDisk *v1.Disk, desDisk *v1.Disk) error {
	// no modification required
	if curDisk.Capacity == desDisk.Capacity && curDisk.VolumeType == desDisk.VolumeType {
		return nil
	}
	eg, _ := errgroup.WithContext(context.Background())
	volumeType := types.VolumeType(desDisk.VolumeType)
	ids := curDisk.ID
	size := int32(desDisk.Capacity)
	for _, id := range ids {
		volumeID := id
		eg.Go(func() error {
			return d.modifyVolumeByID(volumeID, size, volumeType)
		})
	}
	return eg.Wait()
}

func (d Driver) modifyVolumeByID(id string, size int32, volumeType types.VolumeType) error {
	client := d.Client
	modifyInput := &ec2.ModifyVolumeInput{
		VolumeId:   &id,
		Size:       &size,
		VolumeType: volumeType,
	}
	logger.Info("modify volume id:%s, volumeType: %v", id, volumeType)

	if _, err := ModifyVolume(context.TODO(), client, modifyInput); err != nil {
		return fmt.Errorf("modify volume id:%s error:%v", id, err)
	}
	return nil
}
