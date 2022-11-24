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

package runtime

import (
	"fmt"

	"github.com/labring/sealos/pkg/utils/iputils"
	"github.com/labring/sealos/pkg/utils/logger"
)

func (k *KubeadmRuntime) registryAuth(ip string) error {
	logger.Info("registry auth in node %s", ip)
	registry := k.getRegistry()
	err := k.execHostsAppend(ip, iputils.GetHostIP(registry.IP), registry.Domain)
	if err != nil {
		return fmt.Errorf("add registry hosts failed %v", err)
	}

	err = k.execAuth(ip)
	if err != nil {
		return fmt.Errorf("exec auth.sh failed %v", err)
	}
	return nil
}
