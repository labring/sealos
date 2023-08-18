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
	"fmt"
	"strconv"

	"github.com/aliyun/alibaba-cloud-sdk-go/sdk/requests"
	"github.com/aliyun/alibaba-cloud-sdk-go/services/ecs"
	v1 "github.com/labring/sealos/controllers/infra/api/v1"
)

type ECSModifyVolumeAPI interface {
	ModifyDiskSpec(request *ecs.ModifyDiskSpecRequest) (response *ecs.ModifyDiskSpecResponse, err error)
	ResizeDisk(request *ecs.ResizeDiskRequest) (response *ecs.ResizeDiskResponse, err error)
}

func ModifyVolumeSize(api ECSModifyVolumeAPI, request *ecs.ResizeDiskRequest) (*ecs.ResizeDiskResponse, error) {
	return api.ResizeDisk(request)
}

func ModifyVolumeSpec(api ECSModifyVolumeAPI, request *ecs.ModifyDiskSpecRequest) (*ecs.ModifyDiskSpecResponse, error) {
	return api.ModifyDiskSpec(request)
}

func (d Driver) modifyVolume(curDisk *v1.Disk, desDisk *v1.Disk) error {
	if curDisk.Capacity != desDisk.Capacity {
		for _, id := range curDisk.ID {
			resizediskRequest := &ecs.ResizeDiskRequest{
				RpcRequest: ecs.CreateResizeDiskRequest().RpcRequest,
				DiskId:     id,
				NewSize:    requests.Integer(strconv.Itoa(desDisk.Capacity)),
				Type:       "online",
			}
			_, err := ModifyVolumeSize(d.ECSClient, resizediskRequest)
			if err != nil {
				return fmt.Errorf("failed to resize disk %s: %v", curDisk.ID, err)
			}
		}
	}

	if curDisk.VolumeType != desDisk.VolumeType {
		for _, id := range curDisk.ID {
			modifyDiskSpecRequest := &ecs.ModifyDiskSpecRequest{
				RpcRequest:   ecs.CreateModifyDiskSpecRequest().RpcRequest,
				DiskId:       id,
				DiskCategory: desDisk.VolumeType,
			}
			_, err := ModifyVolumeSpec(d.ECSClient, modifyDiskSpecRequest)
			if err != nil {
				return fmt.Errorf("failed to modify disk spec %s: %v", curDisk.ID, err)
			}
		}
	}
	return nil
}
