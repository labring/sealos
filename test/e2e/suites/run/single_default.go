/*
Copyright 2023 cuisongliu@qq.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package run

import (
	"fmt"
	"strings"

	"k8s.io/kubernetes/cmd/kubeadm/app/constants"

	"github.com/labring/sealos/test/e2e/suites/cluster"

	"k8s.io/apimachinery/pkg/util/sets"

	"github.com/labring/sealos/test/e2e/testhelper/settings"

	"github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/test/e2e/testhelper"
	"github.com/labring/sealos/test/e2e/testhelper/cmd"
	"github.com/labring/sealos/test/e2e/testhelper/kube"
)

var _ Interface = &fakeSingleClient{}

func NewFakeSingleClient() Interface {
	return &fakeSingleClient{
		SealosCmd:  cmd.NewSealosCmd(settings.E2EConfig.SealosBinPath, &cmd.LocalCmd{}),
		cInterface: cluster.NewFakeClient(),
	}
}

type fakeSingleClient struct {
	*cmd.SealosCmd
	cInterface cluster.Interface
	v1beta1.Cluster
}

func (c *fakeSingleClient) Run(images ...string) error {
	return c.SealosCmd.Run(&cmd.RunOptions{
		Cluster: "default",
		Images:  images,
	})
}

func (c *fakeSingleClient) Verify(images ...string) error {
	if err := c.cInterface.Verify(); err != nil {
		return err
	}
	cli, err := kube.NewK8sClient("/etc/kubernetes/admin.conf", "")
	if err != nil {
		return err
	}
	nodes, err := cli.ListNodes()
	if err != nil {
		return err
	}
	if len(nodes.Items) != 1 {
		return fmt.Errorf("expect 1 node, but got %d", len(nodes.Items))
	}
	for _, node := range nodes.Items {
		if node.Spec.Taints[0].Key == constants.LabelNodeRoleOldControlPlane {
			return fmt.Errorf("expect node role is master, but got %s", node.Spec.Taints[0].Key)
		}
		if node.Spec.Taints[0].Key == constants.LabelNodeRoleControlPlane {
			return fmt.Errorf("expect node role is master, but got %s", node.Spec.Taints[0].Key)
		}
	}
	imageSet := sets.NewString(images...)
	initFile := "/root/.sealos/default/Clusterfile"
	if !testhelper.IsFileExist(initFile) {
		return fmt.Errorf("file %s not exist", initFile)
	}
	if err = testhelper.UnmarshalYamlFile(initFile, c); err != nil {
		return err
	}

	if !imageSet.HasAll(c.Spec.Image...) {
		return fmt.Errorf("expect image %s not exist in %s", c.Spec.Image, strings.Join(imageSet.List(), ","))
	}
	return nil
}

func (c *fakeSingleClient) Reset() error {
	return c.SealosCmd.Reset(&cmd.ResetOptions{
		Cluster: "default",
		Force:   true,
	})
}
