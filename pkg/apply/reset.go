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

package apply

import (
	"github.com/labring/sealos/pkg/apply/applydrivers"
	"github.com/labring/sealos/pkg/clusterfile"
	"github.com/labring/sealos/pkg/constants"
)

func NewApplierFromResetArgs(args *ResetArgs) (applydrivers.Interface, error) {
	clusterPath := constants.Clusterfile(args.ClusterName)
	cf := clusterfile.NewClusterFile(clusterPath)
	err := cf.Process()
	if err != nil && err != clusterfile.ErrClusterFileNotExists {
		return nil, err
	}
	cluster := cf.GetCluster()
	if cluster == nil {
		cluster = initCluster(args.ClusterName)
	}
	c := &ClusterArgs{
		clusterName: cluster.Name,
		cluster:     cluster,
	}
	if err = c.SetClusterResetArgs(args); err != nil {
		return nil, err
	}
	return applydrivers.NewDefaultApplier(c.cluster, cf, nil)
}
