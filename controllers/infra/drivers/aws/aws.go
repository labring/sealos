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
	"context"
	"fmt"

	"github.com/labring/sealos/controllers/infra/drivers"

	"github.com/aws/aws-sdk-go-v2/service/ec2/types"

	"github.com/labring/sealos/pkg/types/v1beta1"

	v1 "github.com/labring/sealos/controllers/infra/api/v1"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
)

type Driver struct {
	config       aws.Config
	client       *ec2.Client
	infraCurrent *v1.Infra
	infraDesired *v1.Infra
	cluster      *v1beta1.Cluster
}

func (d *Driver) CreateInstances(infra *v1.Infra) error {
	// TODO
	return nil
}

func (d *Driver) GetInstancesByLabel(key string, value string) ([]types.Instance, error) {
	// TODO
	return nil, nil
}

func NewDriver() (drivers.Driver, error) {
	config, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		return nil, fmt.Errorf("load default config failed %s", err)
	}
	client := ec2.NewFromConfig(config)

	return &Driver{
		config,
		client,
		nil,
		nil,
		nil,
	}, nil
}
