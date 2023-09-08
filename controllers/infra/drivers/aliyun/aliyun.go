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

	"github.com/aliyun/alibaba-cloud-sdk-go/services/vpc"

	"github.com/aliyun/alibaba-cloud-sdk-go/services/ecs"
	v1 "github.com/labring/sealos/controllers/infra/api/v1"
)

const (
	AliyunRegionID        = "ALIYUN_REGION_ID"
	AliyunAccessKeyID     = "ALIYUN_ACCESS_KEY_ID"
	AliyunAccessKeySecret = "ALIYUN_ACCESS_KEY_SECRET"
	AliyunResourceGroupID = "ALIYUN_RESOURCE_GROUP_ID"
)

type Driver struct {
	ECSClient       *ecs.Client
	VPCClient       *vpc.Client
	ResourceGroupID string
}

func (d Driver) GetInstances(infra *v1.Infra, status string) ([]v1.Hosts, error) {
	return d.getInstances(infra, status)
}

func (d Driver) DeleteInstances(hosts *v1.Hosts) error {
	return d.deleteInstances(hosts)
}

func (d Driver) StopInstances(hosts *v1.Hosts) error {
	return d.stopInstances(hosts)
}

func (d Driver) ModifyInstances(curHosts *v1.Hosts, desHosts *v1.Hosts) error {
	return d.modifyInstance(curHosts, desHosts)
}

func (d Driver) DeleteInstanceByID(_ string, _ *v1.Infra) error {
	//TODO implement me
	panic("implement me")
}

func (d Driver) CreateInstances(hosts *v1.Hosts, infra *v1.Infra) error {
	return d.createInstances(hosts, infra)
}

func (d Driver) GetInstancesByLabel(key string, value string, infra *v1.Infra) (*v1.Hosts, error) {
	//TODO implement me
	fmt.Print(key, value, infra)
	panic("implement me")
}

func (d Driver) CreateVolumes(infra *v1.Infra, host *v1.Hosts, disks []v1.Disk) error {
	return d.createAndAttachVolumes(infra, host, disks)
}

func (d Driver) DeleteVolume(disksID []string) error {
	return d.deleteAndDetachVolumes(disksID)
}

func (d Driver) ModifyVolume(curDisk *v1.Disk, desDisk *v1.Disk) error {
	return d.modifyVolume(curDisk, desDisk)
}

func (d Driver) CreateKeyPair(infra *v1.Infra) error {
	return d.createKeyPair(infra)
}

func (d Driver) DeleteKeyPair(infra *v1.Infra) error {
	return d.deleteKeyPair(infra)
}

func (d Driver) DeleteInfra(infra *v1.Infra) error {
	return d.deleteInfra(infra)
}
