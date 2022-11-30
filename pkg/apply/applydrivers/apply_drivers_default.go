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
	"os"

	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/version"

	"github.com/labring/sealos/pkg/apply/processor"
	"github.com/labring/sealos/pkg/client-go/kubernetes"
	"github.com/labring/sealos/pkg/clusterfile"
	"github.com/labring/sealos/pkg/constants"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/iputils"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/yaml"
)

func NewDefaultApplier(cluster *v2.Cluster, cf clusterfile.Interface, images []string) (Interface, error) {
	if cluster.Name == "" {
		return nil, fmt.Errorf("cluster name cannot be empty")
	}
	if cf == nil {
		cf = clusterfile.NewClusterFile(constants.Clusterfile(cluster.Name))
	}
	err := cf.Process()
	if !cluster.CreationTimestamp.IsZero() && err != nil {
		return nil, err
	}

	return &Applier{
		ClusterDesired: cluster,
		ClusterFile:    cf,
		ClusterCurrent: cf.GetCluster(),
		RunNewImages:   images,
	}, nil
}

func NewDefaultScaleApplier(current, cluster *v2.Cluster) (Interface, error) {
	if cluster.Name == "" {
		cluster.Name = current.Name
	}
	cFile := clusterfile.NewClusterFile(constants.Clusterfile(cluster.Name))
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
	RunNewImages       []string
}

func (c *Applier) Apply() error {
	clusterPath := constants.Clusterfile(c.ClusterDesired.Name)
	c.initStatus()
	var err error
	if c.ClusterDesired.CreationTimestamp.IsZero() {
		err = c.initCluster()
		c.ClusterDesired.CreationTimestamp = metav1.Now()
	} else {
		err = c.reconcileCluster()
	}
	c.updateStatus(err)
	logger.Debug("write cluster file to local storage: %s", clusterPath)
	return yaml.MarshalYamlToFile(clusterPath, c.getWriteBackObjects()...)
}

func (c *Applier) getWriteBackObjects() []interface{} {
	obj := []interface{}{c.ClusterDesired}
	if configs := c.ClusterFile.GetConfigs(); len(configs) > 0 {
		for i := range configs {
			obj = append(obj, configs[i])
		}
	}
	return obj
}

func (c *Applier) initStatus() {
	c.ClusterDesired.Status.Phase = v2.ClusterInProcess
	c.ClusterDesired.Status.Conditions = make([]v2.ClusterCondition, 0)
}

// todo: atomic updating status after each installation for better reconcile?
// todo: set up signal handler
func (c *Applier) updateStatus(err error) {
	condition := v2.ClusterCondition{
		Type:              "ApplyClusterSuccess",
		Status:            v1.ConditionTrue,
		LastHeartbeatTime: metav1.Now(),
		Reason:            "Ready",
		Message:           "Applied to cluster successfully",
	}
	c.ClusterDesired.Status.Phase = v2.ClusterSuccess
	if err != nil {
		condition.Status = v1.ConditionFalse
		condition.Reason = "ApplyClusterError"
		condition.Message = err.Error()
		logger.Error("Applied to cluster error: %v", err)
	}
	if err != nil {
		c.ClusterDesired.Status.Phase = v2.ClusterFailed
	}
	c.ClusterDesired.Status.Conditions = v2.UpdateCondition(c.ClusterDesired.Status.Conditions, condition)
}

func (c *Applier) reconcileCluster() error {
	// sync newVersion pki and etc dir in `.sealos/default/pki` and `.sealos/default/etc`
	processor.SyncNewVersionConfig(c.ClusterDesired)
	logger.Debug("run new images: %+v", c.RunNewImages)
	if len(c.RunNewImages) != 0 {
		if err := c.installApp(c.RunNewImages); err != nil {
			return err
		}
	}
	mj, md := iputils.GetDiffHosts(c.ClusterCurrent.GetMasterIPAndPortList(), c.ClusterDesired.GetMasterIPAndPortList())
	nj, nd := iputils.GetDiffHosts(c.ClusterCurrent.GetNodeIPAndPortList(), c.ClusterDesired.GetNodeIPAndPortList())
	// if len(mj) == 0 && len(md) == 0 && len(nj) == 0 && len(nd) == 0 {
	//	return c.upgrade()
	// }
	return c.scaleCluster(mj, md, nj, nd)
}

func (c *Applier) initCluster() error {
	logger.Info("Start to create a new cluster: master %s, worker %s, registry %s", c.ClusterDesired.GetMasterIPList(), c.ClusterDesired.GetNodeIPList(), c.ClusterDesired.GetRegistryIP())
	createProcessor, err := processor.NewCreateProcessor(c.ClusterDesired.Name, c.ClusterFile)
	if err != nil {
		return err
	}

	if err = createProcessor.Execute(c.ClusterDesired); err != nil {
		return err
	}

	logger.Info("succeeded in creating a new cluster, enjoy it!")

	return nil
}

func (c *Applier) installApp(images []string) error {
	logger.Info("start to install app in this cluster")
	err := c.ClusterFile.Process()
	if err != nil {
		return err
	}
	installProcessor, err := processor.NewInstallProcessor(c.ClusterFile, images)
	if err != nil {
		return err
	}
	err = installProcessor.Execute(c.ClusterDesired)
	if err != nil {
		return err
	}
	return nil
}

func (c *Applier) scaleCluster(mj, md, nj, nd []string) error {
	if len(mj) == 0 && len(md) == 0 && len(nj) == 0 && len(nd) == 0 {
		logger.Info("no nodes that need to be scaled")
		return nil
	}
	logger.Info("start to scale this cluster")
	logger.Debug("current cluster: master %s, worker %s", c.ClusterCurrent.GetMasterIPAndPortList(), c.ClusterCurrent.GetNodeIPAndPortList())
	logger.Debug("desired cluster: master %s, worker %s", c.ClusterDesired.GetMasterIPAndPortList(), c.ClusterDesired.GetNodeIPAndPortList())
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
	defer func() {
		cfPath := constants.Clusterfile(c.ClusterDesired.Name)
		target := fmt.Sprintf("%s.%d", cfPath, t.Unix())
		logger.Debug("write reset cluster file to local: %s", target)
		if err := yaml.MarshalYamlToFile(cfPath, c.getWriteBackObjects()...); err != nil {
			logger.Error("failed to store cluster file: %v", err)
		}
		_ = os.Rename(cfPath, target)
	}()
	return c.deleteCluster()
}

func (c *Applier) deleteCluster() error {
	deleteProcessor, err := processor.NewDeleteProcessor(c.ClusterDesired.Name, c.ClusterFile)
	if err != nil {
		return err
	}

	if err := deleteProcessor.Execute(c.ClusterDesired); err != nil {
		return err
	}

	logger.Info("succeeded in deleting current cluster")
	return nil
}
