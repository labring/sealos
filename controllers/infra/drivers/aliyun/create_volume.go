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

package aliyun

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/labring/sealos/pkg/utils/retry"

	"github.com/labring/sealos/controllers/infra/common"

	"github.com/aliyun/alibaba-cloud-sdk-go/sdk/requests"
	"github.com/aliyun/alibaba-cloud-sdk-go/services/ecs"
	v1 "github.com/labring/sealos/controllers/infra/api/v1"
	"golang.org/x/sync/errgroup"
)

type ECSCreateVolumeAPI interface {
	CreateDisk(request *ecs.CreateDiskRequest) (response *ecs.CreateDiskResponse, err error)
	AttachDisk(request *ecs.AttachDiskRequest) (response *ecs.AttachDiskResponse, err error)
}

func CreateVolume(api ECSCreateVolumeAPI, request *ecs.CreateDiskRequest) (*ecs.CreateDiskResponse, error) {
	return api.CreateDisk(request)
}

func AttachVolume(api ECSCreateVolumeAPI, request *ecs.AttachDiskRequest) (*ecs.AttachDiskResponse, error) {
	return api.AttachDisk(request)
}

func (d Driver) createAndAttachVolumes(infra *v1.Infra, host *v1.Hosts, disks []v1.Disk) error {
	eg, _ := errgroup.WithContext(context.Background())
	for i := range disks {
		disk := disks[i]
		eg.Go(func() error {
			return d.createAndAttachVolume(infra, host, disk)
		})
	}
	return eg.Wait()
}

func (d Driver) createAndAttachVolume(infra *v1.Infra, host *v1.Hosts, disk v1.Disk) error {
	client := d.ECSClient
	eg, _ := errgroup.WithContext(context.Background())
	availabilityZone := infra.Spec.AvailabilityZone
	if availabilityZone == "" {
		return fmt.Errorf("no availabilityZone for volume")
	}
	createDiskTag := getVolumeTag(infra)

	for _, v := range host.Metadata {
		createDiskRequest := &ecs.CreateDiskRequest{
			RpcRequest:      ecs.CreateCreateDiskRequest().RpcRequest,
			ZoneId:          infra.Spec.AvailabilityZone,
			DiskCategory:    disk.VolumeType,
			Size:            requests.Integer(strconv.Itoa(disk.Capacity)),
			Tag:             &createDiskTag,
			ResourceGroupId: d.ResourceGroupID,
		}
		createDiskResponse, err := CreateVolume(client, createDiskRequest)
		if err != nil {
			return fmt.Errorf("create volume failed: %v", err)
		}

		attachDiskRequest := &ecs.AttachDiskRequest{
			RpcRequest:         ecs.CreateAttachDiskRequest().RpcRequest,
			InstanceId:         v.ID,
			DiskId:             createDiskResponse.DiskId,
			DeleteWithInstance: "true",
		}

		eg.Go(func() error {
			err = retry.Retry(10, 5*time.Second, func() error {
				_, err := AttachVolume(client, attachDiskRequest)
				if err != nil {
					return fmt.Errorf("attach volume failed: %v", err)
				}
				return nil
			})
			if err != nil {
				return fmt.Errorf("attach volume failed: %v", err)
			}
			return nil
		})
	}
	return eg.Wait()
}

func getVolumeTag(infra *v1.Infra) []ecs.CreateDiskTag {
	// Set label tag
	labelKey := common.InfraInstancesLabel
	labelValue := infra.GetInstancesAndVolumesTag()
	uidKey := common.InfraInstancesUUID
	uidValue := string(infra.GetUID())
	return []ecs.CreateDiskTag{
		{
			Key:   labelKey,
			Value: labelValue,
		},
		{
			Key:   uidKey,
			Value: uidValue,
		},
	}
}
