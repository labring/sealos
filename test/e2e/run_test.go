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

	"github.com/labring/sealos/test/e2e/suites/operators"

	"github.com/labring/sealos/test/e2e/suites/checkers"
	"github.com/labring/sealos/test/e2e/testhelper/config"

	. "github.com/onsi/ginkgo/v2"

	"github.com/labring/sealos/test/e2e/testhelper"
)

var _ = Describe("E2E_sealos_run_test", func() {
	var (
		fakeClient         *operators.FakeClient
		err                error
		fakeCheckInterface checkers.FakeInterface
	)
	fakeClient = operators.NewFakeClient("")
	Context("sealos run suit", func() {
		AfterEach(func() {
			err = fakeClient.Cluster.Reset()
			testhelper.CheckErr(err, fmt.Sprintf("failed to reset cluster for earch cluster: %v", err))
		})
		It("sealos run single by containerd", func() {
			images := []string{"labring/kubernetes:v1.25.0", "labring/helm:v3.8.2", "labring/calico:v3.24.1"}
			err = fakeClient.Cluster.Run(images...)
			testhelper.CheckErr(err, fmt.Sprintf("failed to Run new cluster for single: %v", err))
			fakeCheckInterface, err = checkers.NewFakeGroupClient("default", &checkers.FakeOpts{
				Images: images,
			})
			testhelper.CheckErr(err, fmt.Sprintf("failed to get cluster interface: %v", err))
			err = fakeCheckInterface.Verify()
			testhelper.CheckErr(err, fmt.Sprintf("failed to verify cluster for single: %v", err))
		})

		It("sealos run single by docker", func() {
			images := []string{"labring/kubernetes-docker:v1.25.0", "labring/helm:v3.8.2", "labring/calico:v3.24.1"}
			err = fakeClient.Cluster.Run(images...)
			testhelper.CheckErr(err, fmt.Sprintf("failed to Run new cluster for single: %v", err))
			fakeCheckInterface, err = checkers.NewFakeGroupClient("default", &checkers.FakeOpts{Socket: "/var/run/cri-dockerd.sock", Images: images})
			testhelper.CheckErr(err, fmt.Sprintf("failed to get cluster interface: %v", err))
			err = fakeCheckInterface.Verify()
			testhelper.CheckErr(err, fmt.Sprintf("failed to verify cluster for single: %v", err))
		})

		It("sealos run single by containerd-buildimage", func() {

			By("build image from dockerfile")
			kubeadm := `
apiVersion: kubeadm.k8s.io/v1beta2
kind: ClusterConfiguration
networking:
  serviceSubnet: "100.55.0.0/16"
`
			dFile := config.Dockerfile{
				KubeadmYaml: kubeadm,
				BaseImage:   "labring/kubernetes:v1.25.0",
			}
			var tmpdir string
			tmpdir, err = dFile.Write()
			testhelper.CheckErr(err, fmt.Sprintf("failed to create dockerfile: %v", err))

			err = fakeClient.Image.BuildImage("test-build-image:kubeadm-servicecidr", tmpdir, operators.BuildOptions{
				Compress:     false,
				MaxPullProcs: 5,
				SaveImage:    true,
			})
			testhelper.CheckErr(err)
			By("running kubernete image using build image")
			images := []string{"test-build-image:kubeadm-servicecidr", "labring/helm:v3.8.2", "labring/calico:v3.24.1"}
			err = fakeClient.Cluster.Run(images...)
			testhelper.CheckErr(err, fmt.Sprintf("failed to Run new cluster for single: %v", err))
			fakeCheckInterface, err = checkers.NewFakeGroupClient("default", &checkers.FakeOpts{ServiceCIDR: "100.55.0.0/16", Images: images})
			testhelper.CheckErr(err, fmt.Sprintf("failed to get cluster interface: %v", err))
			err = fakeCheckInterface.Verify()
			testhelper.CheckErr(err, fmt.Sprintf("failed to verify cluster for single: %v", err))
		})
		It("sealos run single by docker-buildimage", func() {

			By("build image from dockerfile")
			kubeadm := `
apiVersion: kubeadm.k8s.io/v1beta2
kind: ClusterConfiguration
networking:
  serviceSubnet: "100.55.0.0/16"
`
			dFile := config.Dockerfile{
				KubeadmYaml: kubeadm,
				BaseImage:   "labring/kubernetes-docker:v1.25.0",
			}
			var tmpdir string
			tmpdir, err = dFile.Write()
			testhelper.CheckErr(err, fmt.Sprintf("failed to create dockerfile: %v", err))

			err = fakeClient.Image.BuildImage("test-build-image:kubeadm-servicecidr", tmpdir, operators.BuildOptions{
				Compress:     false,
				MaxPullProcs: 5,
				SaveImage:    true,
			})
			testhelper.CheckErr(err)
			By("running kubernete image using build image")
			images := []string{"test-build-image:kubeadm-servicecidr", "labring/helm:v3.8.2", "labring/calico:v3.24.1"}
			err = fakeClient.Cluster.Run(images...)
			testhelper.CheckErr(err, fmt.Sprintf("failed to Run new cluster for single: %v", err))
			fakeCheckInterface, err = checkers.NewFakeGroupClient("default", &checkers.FakeOpts{ServiceCIDR: "100.55.0.0/16", Socket: "/var/run/cri-dockerd.sock", Images: images})
			testhelper.CheckErr(err, fmt.Sprintf("failed to get cluster interface: %v", err))
			err = fakeCheckInterface.Verify()
			testhelper.CheckErr(err, fmt.Sprintf("failed to verify cluster for single: %v", err))
		})

		It("sealos run single by containerd on load tar", func() {
			images := []string{"labring/kubernetes:v1.25.0", "labring/helm:v3.8.2"}
			err = fakeClient.Image.PullImage(images...)
			testhelper.CheckErr(err, fmt.Sprintf("failed to pull image: %v", err))
			err = fakeClient.Image.SaveImage("labring/kubernetes:v1.25.0", "/tmp/kube.tar")
			testhelper.CheckErr(err, fmt.Sprintf("failed to save image: %v", err))
			err = fakeClient.Cluster.Run("/tmp/kube.tar")
			testhelper.CheckErr(err, fmt.Sprintf("failed to Run new cluster for single using tar: %v", err))
			err = fakeClient.Cluster.Run("labring/helm:v3.8.2")
			testhelper.CheckErr(err, fmt.Sprintf("failed to running image for helm: %v", err))
			newImages := []string{"localhost/labring/kubernetes:v1.25.0", "labring/helm:v3.8.2"}
			fakeCheckInterface, err = checkers.NewFakeGroupClient("default", &checkers.FakeOpts{Images: newImages})
			testhelper.CheckErr(err, fmt.Sprintf("failed to get cluster interface: %v", err))
			err = fakeCheckInterface.Verify()
			testhelper.CheckErr(err, fmt.Sprintf("failed to verify cluster for single: %v", err))
		})

		It("sealos run single by containerd on short name", func() {
			images := []string{"labring/kubernetes:v1.25.0"}
			err = fakeClient.Image.PullImage(images...)
			testhelper.CheckErr(err, fmt.Sprintf("failed to pull image: %v", err))
			err = fakeClient.Image.TagImage("labring/kubernetes:v1.25.0", "k8s:dev")
			testhelper.CheckErr(err, fmt.Sprintf("failed to tag image: %v", err))
			err = fakeClient.Cluster.Run("k8s:dev")
			testhelper.CheckErr(err, fmt.Sprintf("failed to Run new cluster for single using short name: %v", err))
			fakeCheckInterface, err = checkers.NewFakeGroupClient("default", &checkers.FakeOpts{Images: []string{"k8s:dev"}})
			testhelper.CheckErr(err, fmt.Sprintf("failed to get cluster interface: %v", err))
			err = fakeCheckInterface.Verify()
			testhelper.CheckErr(err, fmt.Sprintf("failed to verify cluster for single: %v", err))
		})
	})

})
