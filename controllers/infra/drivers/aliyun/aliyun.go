package aliyun

import (
	"github.com/aliyun/alibaba-cloud-sdk-go/services/ecs"
	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
	v1 "github.com/labring/sealos/controllers/infra/api/v1"
)

type Driver struct {
	Client *ecs.Client
}

func (d Driver) GetInstances(infra *v1.Infra, status types.InstanceStateName) ([]v1.Hosts, error) {
	return d.getInstances(infra, string(status))
}

func (d Driver) DeleteInstances(hosts *v1.Hosts) error {
	//TODO implement me
	panic("implement me")
}

func (d Driver) StopInstances(hosts *v1.Hosts) error {
	//TODO implement me
	panic("implement me")
}

func (d Driver) ModifyInstances(curHosts *v1.Hosts, desHosts *v1.Hosts) error {
	//TODO implement me
	panic("implement me")
}
func (d Driver) DeleteInstanceByID(instanceID string, infra *v1.Infra) error {
	//TODO implement me
	panic("implement me")
}

func (d Driver) CreateInstances(hosts *v1.Hosts, infra *v1.Infra) error {
	//TODO implement me
	panic("implement me")
}

func (d Driver) GetInstancesByLabel(key string, value string, infra *v1.Infra) (*v1.Hosts, error) {
	//TODO implement me
	panic("implement me")
}

func (d Driver) CreateVolumes(infra *v1.Infra, host *v1.Hosts, disks []v1.Disk) error {
	//TODO implement me
	panic("implement me")
}

func (d Driver) DeleteVolume(disksID []string) error {
	//TODO implement me
	panic("implement me")
}

func (d Driver) ModifyVolume(curDisk *v1.Disk, desDisk *v1.Disk) error {
	//TODO implement me
	panic("implement me")
}

func (d Driver) CreateKeyPair(infra *v1.Infra) error {
	//TODO implement me
	panic("implement me")
}

func (d Driver) DeleteKeyPair(infra *v1.Infra) error {
	//TODO implement me
	panic("implement me")
}
