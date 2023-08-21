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

	"github.com/labring/sealos/pkg/utils/logger"

	"golang.org/x/sync/errgroup"

	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
	v1 "github.com/labring/sealos/controllers/infra/api/v1"
	"github.com/labring/sealos/controllers/infra/common"
)

type EC2CreateVolumeAPI interface {
	CreateVolume(ctx context.Context,
		params *ec2.CreateVolumeInput,
		optFns ...func(*ec2.Options)) (*ec2.CreateVolumeOutput, error)

	AttachVolume(ctx context.Context,
		params *ec2.AttachVolumeInput,
		optFns ...func(*ec2.Options)) (*ec2.AttachVolumeOutput, error)
}

func MakeVolume(c context.Context, api EC2CreateVolumeAPI, input *ec2.CreateVolumeInput) (*ec2.CreateVolumeOutput, error) {
	return api.CreateVolume(c, input)
}

func AttachVolume(c context.Context, api EC2CreateVolumeAPI, input *ec2.AttachVolumeInput) (*ec2.AttachVolumeOutput, error) {
	return api.AttachVolume(c, input)
}

// create and attach volume for all instance in host.
func (d Driver) createAndAttachVolumes(infra *v1.Infra, host *v1.Hosts, disks []v1.Disk) error {
	eg, _ := errgroup.WithContext(context.Background())
	for i := range disks {
		disk := disks[i]
		eg.Go(func() error {
			return d.createAndAttachVolume(infra, host, &disk)
		})
	}
	return eg.Wait()
}

func (d Driver) createAndAttachVolume(infra *v1.Infra, host *v1.Hosts, disk *v1.Disk) error {
	deviceName, err := d.generateNewDeviceName(host)
	logger.Info("generate new device name: %s", deviceName)
	if err != nil {
		return err
	}
	client := d.Client
	availabilityZone := infra.Spec.AvailabilityZone
	if availabilityZone == "" {
		return fmt.Errorf("no availabilityZone for volume")
	}
	eg, _ := errgroup.WithContext(context.Background())

	for _, v := range host.Metadata {
		//Volume_tag: [role:true,Data:true,name:namespace+name]
		tags := rolesToTags(host.Roles)
		id := v.ID

		nameKey, fullName := common.InfraVolumesLabel, infra.GetInstancesAndVolumesTag()
		infraIDKey, infraIDValue := common.VolumeInfraID, id

		tags = append(tags, []types.Tag{
			{
				Key:   &nameKey,
				Value: &fullName,
			},
			{
				Key:   &infraIDKey,
				Value: &infraIDValue,
			},
		}...,
		)
		size := int32(disk.Capacity)
		input := &ec2.CreateVolumeInput{
			Size:             &size,
			VolumeType:       types.VolumeType(disk.VolumeType),
			AvailabilityZone: &availabilityZone,
			TagSpecifications: []types.TagSpecification{
				{
					ResourceType: types.ResourceTypeVolume,
					Tags:         tags,
				},
			},
		}
		result, err := MakeVolume(context.TODO(), client, input)
		if err != nil {
			return fmt.Errorf("create volume failed: %v", err)
		}
		inputAttach := &ec2.AttachVolumeInput{
			Device:     &deviceName,
			VolumeId:   result.VolumeId,
			InstanceId: &id,
		}

		//retry 1s,2s,4,8,16,32,64. 8times
		eg.Go(func() error {
			return retryAttachVolume(common.TryTimes, common.TrySleepTime, client, inputAttach)
		})
	}
	return eg.Wait()
}

// generateNewDeviceName generate new device name for new volume.
func (d Driver) generateNewDeviceName(host *v1.Hosts) (string, error) {
	var deviceName string
	deviceIndex := 0
	var deviceSuffix = "fghijklmnop"
	deviceMap := map[string]struct{}{}
	for _, v := range host.Disks {
		deviceMap[v.Device] = struct{}{}
	}
	for i := 0; i < len(deviceSuffix); i++ {
		deviceName = fmt.Sprintf("/dev/sd%s", string(deviceSuffix[i]))
		if _, ok := deviceMap[deviceName]; !ok {
			deviceIndex = i
			break
		}
	}
	return fmt.Sprintf("/dev/sd%s", string(deviceSuffix[deviceIndex])), nil
}

func retryAttachVolume(tryTimes int, trySleepTime time.Duration, client *ec2.Client, inputAttach *ec2.AttachVolumeInput) error {
	var err error
	for i := 0; i < tryTimes; i++ {
		_, err = AttachVolume(context.TODO(), client, inputAttach)
		if err == nil {
			return nil
		}
		if i == tryTimes-1 {
			break
		}
		time.Sleep(trySleepTime * time.Duration(math.Pow(2, float64(i))))
	}
	return fmt.Errorf("retry attach volume action timeout:%v,instanceId:%s,DeviceName:%s,VolumeId:%s", err, *inputAttach.InstanceId, *inputAttach.Device, *inputAttach.VolumeId)
}
