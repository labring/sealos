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

package e2e

import (
	"fmt"

	"github.com/labring/sealos/test/e2e/testdata/kubeadm"

	"github.com/labring/sealos/test/e2e/testhelper/utils"

	"github.com/labring/sealos/test/e2e/suites/operators"

	"github.com/labring/sealos/test/e2e/testhelper/config"
	"github.com/labring/sealos/test/e2e/testhelper/etcd"

	. "github.com/onsi/ginkgo/v2"

	"github.com/labring/sealos/test/e2e/suites/checkers"
)

var _ = Describe("E2E_sealos_apply_other_test", func() {
	var (
		fakeClient         *operators.FakeClient
		err                error
		fakeCheckInterface checkers.FakeInterface
	)
	fakeClient = operators.NewFakeClient("")
	Context("sealos apply suit", func() {
		AfterEach(func() {
			err = fakeClient.Cluster.Reset()
			utils.CheckErr(err, fmt.Sprintf("failed to reset cluster for earch cluster: %v", err))
		})
		It("sealos apply single by containerd add Taints ", func() {
			By("generate Clusterfile")
			clusterfileConfig := config.Clusterfile{
				BinData:  kubeadm.PackageName + "/containerd-svc-taints.yaml",
				Replaces: map[string]string{"127.0.0.1": utils.GetLocalIpv4()},
			}
			applyfile, err := clusterfileConfig.Write()
			utils.CheckErr(err, fmt.Sprintf("failed to write file %s: %v", applyfile, err))

			By("using clusterfile to apply kubernetes image add taints")
			err = fakeClient.Cluster.Apply(applyfile)
			utils.CheckErr(err, fmt.Sprintf("failed to apply new cluster for single: %v", err))
			opts := &checkers.FakeOpts{
				Socket:      "",
				Cgroup:      "",
				PodCIDR:     "",
				ServiceCIDR: "100.56.0.0/16",
				Images:      clusterfileConfig.Cluster.Spec.Image,
				Taints:      map[string]string{"kubeadmNode": "theValue"},
			}
			fakeCheckInterface, err = checkers.NewFakeGroupClient("default", opts)
			utils.CheckErr(err, fmt.Sprintf("failed to get cluster interface: %v", err))
			err = fakeCheckInterface.Verify()
			utils.CheckErr(err, fmt.Sprintf("failed to verify cluster for single: %v", err))
		})
		It("sealos apply single by containerd add external-etcd ", func() {
			By("using clusterfile to apply kubernetes image install external-etcd")
			etcdInstaller := etcd.NewEtcd()
			err = etcdInstaller.Install()
			utils.CheckErr(err, fmt.Sprintf("failed to install etcd: %v", err))
			By("generate Clusterfile")
			clusterfileConfig := config.Clusterfile{
				BinData:  kubeadm.PackageName + "/containerd-svc-etcd.yaml",
				Replaces: map[string]string{"127.0.0.1": utils.GetLocalIpv4()},
			}
			applyfile, err := clusterfileConfig.Write()
			utils.CheckErr(err, fmt.Sprintf("failed to write file %s: %v", applyfile, err))

			By("using clusterfile to apply kubernetes image add external-etcd")
			err = fakeClient.Cluster.Apply(applyfile)
			utils.CheckErr(err, fmt.Sprintf("failed to apply new cluster for single: %v", err))
			opts := &checkers.FakeOpts{
				Socket:      "",
				Cgroup:      "",
				PodCIDR:     "",
				ServiceCIDR: "100.56.0.0/16",
				Images:      clusterfileConfig.Cluster.Spec.Image,
				Etcd:        []string{fmt.Sprintf("http://%s:2379", utils.GetLocalIpv4())},
			}
			fakeCheckInterface, err = checkers.NewFakeGroupClient("default", opts)
			utils.CheckErr(err, fmt.Sprintf("failed to get cluster interface: %v", err))
			err = fakeCheckInterface.Verify()
			utils.CheckErr(err, fmt.Sprintf("failed to verify cluster for single: %v", err))
		})
	})

})
