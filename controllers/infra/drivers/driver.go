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

package drivers

import (
	"context"
	"fmt"
	"os"

	"github.com/aliyun/alibaba-cloud-sdk-go/services/ecs"
	"github.com/labring/sealos/controllers/infra/drivers/aliyun"

	"github.com/aws/aws-sdk-go-v2/service/ec2/types"

	"github.com/labring/sealos/controllers/infra/drivers/aws"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	v1 "github.com/labring/sealos/controllers/infra/api/v1"
)

type Driver interface {
	CreateInstances(hosts *v1.Hosts, infra *v1.Infra) error
	DeleteInstances(hosts *v1.Hosts) error
	StopInstances(hosts *v1.Hosts) error
	ModifyInstances(curHosts *v1.Hosts, desHosts *v1.Hosts) error
	DeleteInstanceByID(instanceID string, infra *v1.Infra) error
	GetInstancesByLabel(key string, value string, infra *v1.Infra) (*v1.Hosts, error)
	// get infra all current hosts
	GetInstances(infra *v1.Infra, status types.InstanceStateName) ([]v1.Hosts, error)
	// Volumes operation
	// Create and Attach
	CreateVolumes(infra *v1.Infra, host *v1.Hosts, disks []v1.Disk) error
	// Delete and Detach
	DeleteVolume(disksID []string) error
	// Modify
	ModifyVolume(curDisk *v1.Disk, desDisk *v1.Disk) error
	CreateKeyPair(infra *v1.Infra) error
	DeleteKeyPair(infra *v1.Infra) error
}

type Reconcile interface {
	ReconcileInstance(infra *v1.Infra, driver Driver) error
}

func NewDriver(platform string) (Driver, error) {
	switch platform {
	case "aws":
		return NewAWSDriver()
	case "aliyun":
		return NewAliyunDriver()
	}
	return nil, fmt.Errorf("not support platform %s", platform)
}

func NewAWSDriver() (Driver, error) {
	config, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		return nil, fmt.Errorf("load default config failed %s", err)
	}
	client := ec2.NewFromConfig(config)

	return &aws.Driver{
		Config: config,
		Client: client,
	}, nil
}

func NewAliyunDriver() (Driver, error) {
	regionID := os.Getenv("ALIYUN_REGION_ID")
	accessKeyID := os.Getenv("ALIYUN_ACCESS_KEY_ID")
	accessKeySecret := os.Getenv("ALIYUN_ACCESS_KEY_SECRET")
	client, err := ecs.NewClientWithAccessKey(regionID, accessKeyID, accessKeySecret)
	if err != nil {
		return nil, fmt.Errorf("get aliyun ecs client failed %s", err)
	}
	return &aliyun.Driver{
		Client: client,
	}, nil
}
