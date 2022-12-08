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
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
	v1 "github.com/labring/sealos/controllers/infra/api/v1"
)

type Driver struct {
	Config aws.Config
	Client *ec2.Client
}

func (d Driver) GetInstances(infra *v1.Infra, status types.InstanceStateName) ([]v1.Hosts, error) {
	return d.getInstances(infra, status)
}

func (d Driver) DeleteInstances(hosts *v1.Hosts) error {
	return d.deleteInstances(hosts)
}

func (d Driver) StopInstances(hosts *v1.Hosts) error {
	return d.stopInstances(hosts)
}

func (d Driver) ModifyInstances(curHosts *v1.Hosts, desHosts *v1.Hosts) error {
	return d.modifyInstances(curHosts, desHosts)
}
func (d Driver) DeleteInstanceByID(instanceID string, infra *v1.Infra) error {
	//TODO implement me
	panic("implement me")
}

func (d Driver) CreateInstances(hosts *v1.Hosts, infra *v1.Infra) error {
	return d.createInstances(hosts, infra)
}

func (d Driver) GetInstancesByLabel(key string, value string, infra *v1.Infra) (*v1.Hosts, error) {
	return d.getInstancesByLabel(key, value, infra)
}

func (d Driver) CreateVolumes(infra *v1.Infra, host *v1.Hosts, disks []v1.Disk) error {
	return d.createAndAttachVolumes(infra, host, disks)
}

func (d Driver) DeleteVolume(disksID []string) error {
	return d.detachAndDeleteVolumeByID(disksID)
}

func (d Driver) ModifyVolume(curDisk *v1.Disk, desDisk *v1.Disk) error {
	return d.modifyVolume(curDisk, desDisk)
}

func (d Driver) DeleteKeyPair(infra *v1.Infra) error {
	return d.deleteKeyPair(infra)
}
