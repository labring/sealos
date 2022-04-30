// Copyright © 2021 Alibaba Group Holding Ltd.
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

package infra

import (
	"fmt"
	"os"

	"github.com/labring/sealos/pkg/infra/huawei"
	"github.com/labring/sealos/pkg/types/validation"

	"github.com/labring/sealos/pkg/infra/aliyun"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

type Interface interface {
	// Apply apply iaas resources and save metadata info like vpc instance id to cluster status
	// https://github.com/fanux/sealgate/tree/master/cloud
	Apply() error
}

const (
	EnvAccessKey    = "ECS_AKID"
	EnvAccessSecret = "ECS_AKSK"
)

func loadConfig(infra *v2.Infra) {
	if ak := os.Getenv(EnvAccessKey); ak != "" {
		infra.Spec.Credential.AccessKey = ak
	}
	if sk := os.Getenv(EnvAccessSecret); sk != "" {
		infra.Spec.Credential.AccessSecret = sk
	}
}

func newAliProvider(infra *v2.Infra) (Interface, error) {
	aliProvider := new(aliyun.AliProvider)
	aliProvider.Infra = infra
	if err := aliProvider.NewClient(); err != nil {
		return nil, err
	}
	return aliProvider, nil
}

func newHwProvider(infra *v2.Infra) (Interface, error) {
	hwProvider := new(huawei.HwProvider)
	hwProvider.Infra = infra
	if err := v2.DefaultInfra(hwProvider.Infra, huawei.DefaultInfra); err != nil {
		return nil, err
	}
	if err := validation.ValidateInfra(hwProvider.Infra, huawei.DefaultValidate); len(err) != 0 {
		return nil, err.ToAggregate()
	}
	if err := hwProvider.NewClient(); err != nil {
		return nil, err
	}
	return hwProvider, nil
}

func NewDefaultProvider(infra *v2.Infra) (Interface, error) {
	loadConfig(infra)
	switch infra.Spec.Provider {
	case aliyun.AliyunProvider:
		return newAliProvider(infra)
	case huawei.HuaweiProvider:
		return newHwProvider(infra)
	default:
		return nil, fmt.Errorf("the provider is invalid, please set the provider correctly")
	}
}
