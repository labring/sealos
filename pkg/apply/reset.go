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
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/contants"
	fileutil "github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/yaml"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func NewApplierFromResetArgs(args *ResetArgs) (applydrivers.Interface, error) {
	var cluster *v2.Cluster
	clusterPath := contants.Clusterfile(args.ClusterName)
	if fileutil.IsExist(clusterPath) {
		clusterFile := clusterfile.NewClusterFile(clusterPath)
		err := clusterFile.Process()
		if err != nil {
			return nil, err
		}
		cluster = clusterFile.GetCluster()
		if args.Nodes == "" && args.Masters == "" {
			return applydrivers.NewDefaultApplier(cluster, nil)
		}
	}
	cluster = &v2.Cluster{}
	cluster.CreationTimestamp = metav1.Now()
	cluster.Name = args.ClusterName
	cluster.Kind = "Cluster"
	c := &ClusterArgs{
		clusterName: args.ClusterName,
		cluster:     cluster,
	}
	if err := c.SetClusterResetArgs(args.ToRunArgs()); err != nil {
		return nil, err
	}
	logger.Debug("write reset cluster file to local storage: %s", clusterPath)
	if err := yaml.MarshalYamlToFile(clusterPath, cluster); err != nil {
		return nil, err
	}
	return applydrivers.NewDefaultApplier(c.cluster, nil)
}
