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

package k3s

import (
	"context"
	"fmt"

	"golang.org/x/exp/slices"

	"github.com/labring/sealos/pkg/utils/logger"

	"golang.org/x/sync/errgroup"
)

func (k *K3s) resetNodes(nodes []string) error {
	eg, _ := errgroup.WithContext(context.Background())
	for i := range nodes {
		node := nodes[i]
		eg.Go(func() error {
			if err := k.deleteNode(node); err != nil {
				return err
			}
			return k.resetNode(node)
		})
	}
	return eg.Wait()
}

func (k *K3s) resetNode(host string) error {
	logger.Info("start to reset node: %s", host)
	if slices.Contains(k.cluster.GetNodeIPList(), host) {
		vipAndPort := fmt.Sprintf("%s:%d", k.cluster.GetVIP(), k.config.APIServerPort)
		ipvscleanErr := k.remoteUtil.IPVSClean(host, vipAndPort)
		if ipvscleanErr != nil {
			logger.Error("failed to clean node route and ipvs failed, %v", ipvscleanErr)
		}
	}
	return nil
}

// TODO: remove from API
func (k *K3s) deleteNode(_ string) error {
	return nil
}
