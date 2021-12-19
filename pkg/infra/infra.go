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

	"github.com/fanux/sealos/pkg/infra/aliyun"
	v2 "github.com/fanux/sealos/pkg/types/v1beta1"
)

type Interface interface {
	// Apply apply iaas resources and save metadata info like vpc instance id to cluster status
	// https://github.com/fanux/sealgate/tree/master/cloud
	Apply() error
}

func newAliProvider(infra *v2.Infra) (Interface, error) {
	config := new(aliyun.Config)
	err := aliyun.LoadConfig(config)
	if err != nil {
		return nil, err
	}
	aliProvider := new(aliyun.AliProvider)
	aliProvider.Config = *config
	aliProvider.Infra = infra
	err = aliProvider.NewClient()
	if err != nil {
		return nil, err
	}
	return aliProvider, nil
}

func NewDefaultProvider(infra *v2.Infra) (Interface, error) {
	switch infra.Spec.Provider {
	case v2.AliyunProvider:
		return newAliProvider(infra)
	default:
		return nil, fmt.Errorf("the provider is invalid, please set the provider correctly")
	}
}
