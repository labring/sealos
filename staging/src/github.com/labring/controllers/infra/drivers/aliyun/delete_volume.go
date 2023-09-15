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
	"time"

	"github.com/labring/sealos/pkg/utils/retry"

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/aliyun/alibaba-cloud-sdk-go/services/ecs"
	"golang.org/x/sync/errgroup"
)

type ECSDeleteVolumeAPI interface {
	DeleteDisk(request *ecs.DeleteDiskRequest) (response *ecs.DeleteDiskResponse, err error)
	DetachDisk(request *ecs.DetachDiskRequest) (response *ecs.DetachDiskResponse, err error)
}

func DeleteVolume(api ECSDeleteVolumeAPI, request *ecs.DeleteDiskRequest) (*ecs.DeleteDiskResponse, error) {
	return api.DeleteDisk(request)
}

func DetachVolume(api ECSDeleteVolumeAPI, request *ecs.DetachDiskRequest) (*ecs.DetachDiskResponse, error) {
	return api.DetachDisk(request)
}

func (d Driver) deleteAndDetachVolumes(diskIDs []string) error {
	eg, _ := errgroup.WithContext(context.Background())
	for _, id := range diskIDs {
		diskID := id
		eg.Go(func() error {
			logger.Info("delete volume %s", diskID)
			return d.deleteAndDetachVolume(diskID)
		})
	}
	return eg.Wait()
}

func (d Driver) deleteAndDetachVolume(diskID string) error {
	client := d.ECSClient
	// get instance id
	describeDiskRequest := &ecs.DescribeDisksRequest{
		RpcRequest: ecs.CreateDescribeDisksRequest().RpcRequest,
		DiskIds:    "[\"" + diskID + "\"]",
	}
	describeDiskResponse, err := GetDisks(client, describeDiskRequest)
	if err != nil || len(describeDiskResponse.Disks.Disk) == 0 {
		return fmt.Errorf("get disk info error:%v", err)
	}
	// detach volume
	detachDiskRequest := &ecs.DetachDiskRequest{
		RpcRequest: ecs.CreateDetachDiskRequest().RpcRequest,
		InstanceId: describeDiskResponse.Disks.Disk[0].InstanceId,
		DiskId:     diskID,
	}
	err = retry.Retry(10, 5*time.Second, func() error {
		_, err = DetachVolume(client, detachDiskRequest)
		if err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("detach disk error:%v", err)
	}
	// delete volume
	deleteDiskRequest := &ecs.DeleteDiskRequest{
		RpcRequest: ecs.CreateDeleteDiskRequest().RpcRequest,
		DiskId:     diskID,
	}
	err = retry.Retry(10, 5*time.Second, func() error {
		_, err = DeleteVolume(client, deleteDiskRequest)
		if err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("delete volume error:%v", err)
	}
	return nil
}
