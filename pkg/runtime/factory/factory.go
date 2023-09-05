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

package factory

import (
	"errors"
	"fmt"

	"github.com/labring/sealos/pkg/runtime"
	"github.com/labring/sealos/pkg/runtime/k3s"
	"github.com/labring/sealos/pkg/runtime/kubernetes"
	"github.com/labring/sealos/pkg/runtime/kubernetes/types"
	"github.com/labring/sealos/pkg/types/v1beta1"
)

func New(cluster *v1beta1.Cluster, cfg runtime.Config) (runtime.Interface, error) {
	if cluster == nil {
		return nil, errors.New("cluster cannot be null")
	}
	distribution := cluster.GetDistribution()
	switch distribution {
	case kubernetes.Distribution, "kubeadm", "":
		return kubernetes.New(cluster, cfg)
	case k3s.Distribution:
		return k3s.New(cluster, cfg)
	}
	return nil, fmt.Errorf("unsupported distribution %s", distribution)
}

func NewRuntimeConfig(distribution string) (runtime.Config, error) {
	switch distribution {
	case kubernetes.Distribution, "kubeadm", "":
		return types.NewKubeadmConfig(), nil
	case k3s.Distribution:
		return &k3s.Config{}, nil
	}
	return nil, fmt.Errorf("unsupported distribution %s", distribution)
}
