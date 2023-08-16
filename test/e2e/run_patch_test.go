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
	"path"

	"github.com/labring/sealos/test/e2e/testhelper/config"
	"github.com/labring/sealos/test/e2e/testhelper/utils"

	"github.com/labring/sealos/test/e2e/suites/operators"

	. "github.com/onsi/ginkgo/v2"

	"github.com/labring/sealos/test/e2e/suites/checkers"
)

var _ = Describe("E2E_sealos_run_patchimage_test", func() {
	var (
		fakeClient         *operators.FakeClient
		err                error
		fakeCheckInterface checkers.FakeInterface
	)
	fakeClient = operators.NewFakeClient("")
	Context("sealos run suit", func() {
		AfterEach(func() {
			err = fakeClient.Cluster.Reset()
			utils.CheckErr(err, fmt.Sprintf("failed to reset cluster for earch cluster: %v", err))
		})
		It("sealos run patch image containerd", func() {
			By("write dockerfile")
			dFile := config.PatchDockerfile{
				Images: []string{"nginx"},
				Copys:  []string{"sealctl opt/sealctl", "image-cri-shim cri/image-cri-shim"},
				Cmds:   []string{"systemctl stop image-cri-shim", "cp cri/image-cri-shim /usr/bin/image-cri-shim", "systemctl start image-cri-shim", "image-cri-shim -v"},
			}
			tmpdir, err := dFile.Write()
			utils.CheckErr(err, fmt.Sprintf("failed to create dockerfile: %v", err))

			By("copy sealctl to rootfs")
			err = fakeClient.CmdInterface.Copy("/tmp/sealctl", path.Join(tmpdir, "sealctl"))
			utils.CheckErr(err, fmt.Sprintf("failed to copy sealctl to rootfs: %v", err))

			By("copy image-cri-shim to rootfs")
			err = fakeClient.CmdInterface.Copy("/tmp/image-cri-shim", path.Join(tmpdir, "image-cri-shim"))
			utils.CheckErr(err, fmt.Sprintf("failed to copy image-cri-shim to rootfs: %v", err))

			By("build image")
			err = fakeClient.Image.BuildImage("test-build-image:patch-upgrade", tmpdir, operators.BuildOptions{
				MaxPullProcs: 5,
			})
			utils.CheckErr(err)

			images := []string{"labring/kubernetes:v1.25.0", "labring/helm:v3.8.2"}
			err = fakeClient.Image.PullImage(images...)
			utils.CheckErr(err, fmt.Sprintf("failed to pull image: %v", err))
			err = fakeClient.Cluster.Run(images...)
			utils.CheckErr(err, fmt.Sprintf("failed to Run new cluster for single using tar: %v", err))
			newImages := []string{"labring/kubernetes:v1.25.0", "labring/helm:v3.8.2"}
			fakeCheckInterface, err = checkers.NewFakeGroupClient("default", &checkers.FakeOpts{Images: newImages})
			utils.CheckErr(err, fmt.Sprintf("failed to get cluster interface: %v", err))
			err = fakeCheckInterface.Verify()
			utils.CheckErr(err, fmt.Sprintf("failed to verify cluster for single: %v", err))
			patchImage := "test-build-image:patch-upgrade"
			err = fakeClient.Cluster.Run(patchImage)
			utils.CheckErr(err, fmt.Sprintf("failed to Run patch image for single using tar: %v", err))
		})
	})

})
