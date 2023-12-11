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

package checkers

import (
	"fmt"

	"k8s.io/kubernetes/cmd/kubeadm/app/constants"

	"github.com/labring/sealos/test/e2e/testhelper/kube"
)

var _ FakeInterface = &fakeSingleTaintsClient{}

type fakeSingleTaintsClient struct {
	*fakeClient
}

func (f *fakeSingleTaintsClient) Verify() error {
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
		for _, taint := range node.Spec.Taints {
			if taint.Key == "node-role.kubernetes.io/master" {
				return fmt.Errorf("expect node role is master, but got %s", taint.Key)
			}
			if taint.Key == constants.LabelNodeRoleControlPlane {
				return fmt.Errorf("expect node role is master, but got %s", taint.Key)
			}
		}
	}
	return nil
}
