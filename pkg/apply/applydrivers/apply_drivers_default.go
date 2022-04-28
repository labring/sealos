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

	"github.com/fanux/sealos/pkg/utils/iputils"
	"github.com/fanux/sealos/pkg/utils/strings"

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
	_ = cFile.Process()
	return &Applier{
		ClusterDesired: cluster,
		ClusterFile:    cFile,
		ClusterCurrent: cFile.GetCluster(),
	}, nil
}

func NewDefaultScaleApplier(current, cluster *v2.Cluster) (Interface, error) {
	if cluster.Name == "" {
		return nil, fmt.Errorf("cluster name cannot be empty")
	}
	cFile := clusterfile.NewClusterFile(contants.Clusterfile(cluster.Name))
	return &Applier{
		ClusterDesired: cluster,
		ClusterFile:    cFile,
		ClusterCurrent: current,
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
	if err := c.installApp(); err != nil {
		return err
	}
	mj, md := iputils.GetDiffHosts(c.ClusterCurrent.GetMasterIPList(), c.ClusterDesired.GetMasterIPList())
	nj, nd := iputils.GetDiffHosts(c.ClusterCurrent.GetNodeIPList(), c.ClusterDesired.GetNodeIPList())
	//if len(mj) == 0 && len(md) == 0 && len(nj) == 0 && len(nd) == 0 {
	//	return c.upgrade()
	//}
	return c.scaleCluster(mj, md, nj, nd)
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
func diffImages(spec, curr *v2.Cluster) v2.ImageList {
	pullImages := make([]string, 0)
	for _, img := range spec.Spec.Image {
		if strings.NotIn(img, curr.Spec.Image) {
			pullImages = append(pullImages, img)
		}
	}
	return pullImages
}

func (c *Applier) installApp() error {
	err := c.ClusterFile.Process()
	if err != nil {
		return err
	}
	current := c.ClusterFile.GetCluster()
	pullImages := diffImages(c.ClusterDesired, current)
	if len(pullImages) != 0 {
		installProcessor, err := processor.NewInstallProcessor(c.ClusterFile, pullImages)
		if err != nil {
			return err
		}
		err = installProcessor.Execute(c.ClusterDesired)
		if err != nil {
			return err
		}
	}
	logger.Info("no change exec install app images")
	return nil
}

func (c *Applier) scaleCluster(mj, md, nj, nd []string) error {
	logger.Info("Start to scale this cluster")
	logger.Debug("current cluster: master %s, worker %s", c.ClusterCurrent.GetMasterIPList(), c.ClusterCurrent.GetNodeIPList())
	logger.Debug("desired cluster: master %s, worker %s", c.ClusterDesired.GetMasterIPList(), c.ClusterDesired.GetNodeIPList())
	if len(mj) == 0 && len(md) == 0 && len(nj) == 0 && len(nd) == 0 {
		logger.Info("succeeded in scaling this cluster: no change nodes")
		return nil
	}
	scaleProcessor, err := processor.NewScaleProcessor(c.ClusterFile, c.ClusterDesired.Spec.Image, mj, md, nj, nd)
	if err != nil {
		return err
	}
	cluster := c.ClusterDesired
	err = scaleProcessor.Execute(cluster)
	if err != nil {
		return err
	}
	logger.Info("succeeded in scaling this cluster")
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
