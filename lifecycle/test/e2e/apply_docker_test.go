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

	. "github.com/onsi/ginkgo/v2"

	"github.com/labring/sealos/test/e2e/testhelper/config"

	"github.com/labring/sealos/test/e2e/suites/checkers"
)

var _ = Describe("E2E_sealos_apply_docker_test", func() {
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
		It("sealos apply single by docker", func() {

			By("generate Clusterfile")
			clusterfileConfig := config.Clusterfile{
				BinData:  kubeadm.PackageName + "/docker-svc-sans.yaml",
				Replaces: map[string]string{"127.0.0.1": utils.GetLocalIpv4()},
			}
			applyfile, err := clusterfileConfig.Write()
			utils.CheckErr(err, fmt.Sprintf("failed to write file %s: %v", applyfile, err))

			By("running kubernete image using apply")
			err = fakeClient.Cluster.Apply(applyfile)
			utils.CheckErr(err, fmt.Sprintf("failed to apply new cluster for single: %v", err))
			opts := &checkers.FakeOpts{
				Socket:      "/var/run/cri-dockerd.sock",
				Cgroup:      "",
				PodCIDR:     "",
				ServiceCIDR: "100.55.0.0/16",
				CertSan:     "192.168.72.100",
				Images:      clusterfileConfig.Cluster.Spec.Image,
			}
			fakeCheckInterface, err = checkers.NewFakeGroupClient("default", opts)
			utils.CheckErr(err, fmt.Sprintf("failed to get cluster interface: %v", err))
			err = fakeCheckInterface.Verify()
			utils.CheckErr(err, fmt.Sprintf("failed to verify cluster for single: %v", err))
		})
		It("sealos apply single by docker-buildimage", func() {

			By("build image from dockerfile")
			kubeadmVar := `
apiVersion: kubeadm.k8s.io/v1beta2
kind: ClusterConfiguration
networking:
  serviceSubnet: "100.55.0.0/16"
  podSubnet: "10.160.0.0/12"
`
			dFile := config.RootfsDockerfile{
				KubeadmYaml: kubeadmVar,
				BaseImage:   "labring/kubernetes-docker:v1.25.0",
			}
			var tmpdir string
			tmpdir, err = dFile.Write()
			utils.CheckErr(err, fmt.Sprintf("failed to create dockerfile: %v", err))
			err = fakeClient.Image.BuildImage("apply-hack-docker:kubeadm-network", tmpdir, operators.BuildOptions{
				MaxPullProcs: 5,
				SaveImage:    true,
			})
			utils.CheckErr(err, fmt.Sprintf("failed to build image: %v", err))
			By("generate Clusterfile")
			clusterfileConfig := config.Clusterfile{
				BinData:  kubeadm.PackageName + "/custome-docker-svc.yaml",
				Replaces: map[string]string{"127.0.0.1": utils.GetLocalIpv4(), "labring/kubernetes-docker:v1.25.0": "apply-hack-docker:kubeadm-network"},
			}
			applyfile, err := clusterfileConfig.Write()
			utils.CheckErr(err, fmt.Sprintf("failed to write file %s: %v", applyfile, err))

			By("apply kubernete image using build image")
			err = fakeClient.Cluster.Apply(applyfile)
			utils.CheckErr(err, fmt.Sprintf("failed to apply new cluster for single: %v", err))
			opts := &checkers.FakeOpts{
				Socket:      "/var/run/cri-dockerd.sock",
				Cgroup:      "",
				PodCIDR:     "10.160.0.0/12",
				ServiceCIDR: "100.56.0.0/16",
				Images:      clusterfileConfig.Cluster.Spec.Image,
			}
			fakeCheckInterface, err = checkers.NewFakeGroupClient("default", opts)
			utils.CheckErr(err, fmt.Sprintf("failed to get cluster interface: %v", err))
			err = fakeCheckInterface.Verify()
			utils.CheckErr(err, fmt.Sprintf("failed to verify cluster for single: %v", err))
		})
	})

})
