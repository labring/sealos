package aliyun

import (
	"github.com/aliyun/alibaba-cloud-sdk-go/services/ecs"
	v1 "github.com/labring/sealos/controllers/infra/api/v1"
)

type Driver struct {
	Client *ecs.Client
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

func (d Driver) DeleteInstanceByID(instanceID string, infra *v1.Infra) error {
	//TODO implement me
	panic("implement me")
}

func (d Driver) CreateInstances(hosts *v1.Hosts, infra *v1.Infra) error {
	return d.createInstances(hosts, infra)
}

func (d Driver) GetInstancesByLabel(key string, value string, infra *v1.Infra) (*v1.Hosts, error) {
	//TODO implement me
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
