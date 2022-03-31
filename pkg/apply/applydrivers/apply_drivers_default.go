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

package applydrivers

import (
	"fmt"

	"github.com/fanux/sealos/pkg/apply/processor"
	"github.com/fanux/sealos/pkg/utils/logger"
	"github.com/fanux/sealos/pkg/utils/yaml"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/fanux/sealos/pkg/client-go/kubernetes"
	"github.com/fanux/sealos/pkg/clusterfile"
	v2 "github.com/fanux/sealos/pkg/types/v1beta1"
	"github.com/fanux/sealos/pkg/utils/contants"
	"k8s.io/apimachinery/pkg/version"
)

func NewDefaultApplier(cluster *v2.Cluster) (Interface, error) {
	if cluster.Name == "" {
		return nil, fmt.Errorf("cluster name cannot be empty")
	}
	cFile := clusterfile.NewClusterFile(contants.Clusterfile(cluster.Name))
	return &Applier{
		ClusterDesired: cluster,
		ClusterFile:    cFile,
	}, nil
}

type Applier struct {
	ClusterDesired     *v2.Cluster
	ClusterCurrent     *v2.Cluster
	ClusterFile        clusterfile.Interface
	Client             kubernetes.Client
	CurrentClusterInfo *version.Info
}

func (c *Applier) Apply() error {
	clusterPath := contants.Clusterfile(c.ClusterDesired.Name)
	if c.ClusterDesired.CreationTimestamp.IsZero() {
		if err := c.initCluster(); err != nil {
			return err
		}
		c.ClusterDesired.CreationTimestamp = metav1.Now()
	} else {
		if err := c.reconcileCluster(); err != nil {
			return err
		}
	}
	logger.Debug("write cluster file to local storage: %s", clusterPath)
	return yaml.MarshalYamlToFile(clusterPath, c.ClusterDesired)
}

func (c *Applier) reconcileCluster() error {
	return nil
}

func (c *Applier) initCluster() error {
	logger.Info("Start to create a new cluster: master %s, worker %s", c.ClusterDesired.GetMasterIPList(), c.ClusterDesired.GetNodeIPList())
	createProcessor, err := processor.NewCreateProcessor(c.ClusterFile)
	if err != nil {
		return err
	}

	if err = createProcessor.Execute(c.ClusterDesired); err != nil {
		return err
	}

	logger.Info("succeeded in creating a new cluster, enjoy it!")

	return nil
}

func (c *Applier) Delete() error {
	t := metav1.Now()
	c.ClusterDesired.DeletionTimestamp = &t
	return c.deleteCluster()
}

func (c *Applier) deleteCluster() error {
	deleteProcessor, err := processor.NewDeleteProcessor(c.ClusterFile)
	if err != nil {
		return err
	}

	if err := deleteProcessor.Execute(c.ClusterDesired); err != nil {
		return err
	}

	logger.Info("succeeded in deleting current cluster")

	return nil
}
