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
	"os"
	"path"

	"github.com/labring/sealos/test/e2e/testhelper/cmd"

	"github.com/labring/sealos/test/e2e/suites/operators"
	"github.com/labring/sealos/test/e2e/testhelper/config"
	"github.com/labring/sealos/test/e2e/testhelper/utils"

	"github.com/labring/sealos/test/e2e/suites/checkers"

	. "github.com/onsi/ginkgo/v2"
)

var _ = Describe("E2E_sealos_filesystem_test", func() {
	var (
		fakeClient         *operators.FakeClient
		fakeCheckInterface checkers.FakeInterface
		err                error
	)
	fakeClient = operators.NewFakeClient("")

	Context("sealos filesystem suit", func() {
		BeforeEach(func() {
			By("build rootfs")
			dFile := config.RootfsDockerfile{
				BaseImage: "labring/kubernetes:v1.25.0",
				Copys:     []string{"sealctl opt/"},
			}
			tmpdir, err := dFile.Write()
			utils.CheckErr(err, fmt.Sprintf("failed to create dockerfile: %v", err))

			By("copy sealctl to rootfs")
			err = fakeClient.CmdInterface.Copy("/tmp/sealctl", path.Join(tmpdir, "sealctl"))
			utils.CheckErr(err, fmt.Sprintf("failed to copy sealctl to rootfs: %v", err))

			By("build image")
			err = fakeClient.Image.BuildImage("kubernetes-filesystem:v1.25.0", tmpdir, operators.BuildOptions{
				MaxPullProcs: 5,
			})
			utils.CheckErr(err, fmt.Sprintf("failed to build image: %v", err))
		})
		AfterEach(func() {
			err = fakeClient.Cluster.Reset()
			utils.CheckErr(err, fmt.Sprintf("failed to reset cluster for single: %v", err))
		})
		It("sealos normal filesystem suit", func() {
			By("run kubernetes-filesystem:v1.25.0 for normal")
			err = fakeClient.Cluster.Run("kubernetes-filesystem:v1.25.0")
			utils.CheckErr(err)
			err = fakeClient.CmdInterface.AsyncExec("crictl", "images")
			utils.CheckErr(err)
			By("check kubernetes-filesystem:v1.25.0 for normal")
			fakeCheckInterface, err = checkers.NewFakeGroupClient("default", &checkers.FakeOpts{
				Images: []string{"kubernetes-filesystem:v1.25.0"},
			})
			utils.CheckErr(err, fmt.Sprintf("failed to get cluster interface: %v", err))
			err = fakeCheckInterface.Verify()
			utils.CheckErr(err, fmt.Sprintf("failed to verify cluster for single: %v", err))
		})

		It("sealos filesystem sync registry suit", func() {
			By("run kubernetes-filesystem:v1.25.0 for registry")
			_ = os.Setenv("SEALOS_REGISTRY_SYNC_EXPERIMENTAL", "true")
			cmd.SetDebug()
			err = fakeClient.Cluster.Run("kubernetes-filesystem:v1.25.0")
			utils.CheckErr(err)
			err = fakeClient.CmdInterface.AsyncExec("crictl", "images")
			utils.CheckErr(err)
			err = fakeClient.Cluster.Run("labring/calico:v3.25.0")
			utils.CheckErr(err)
			err = fakeClient.CmdInterface.AsyncExec("crictl", "images")
			utils.CheckErr(err)
			_ = os.Unsetenv("SEALOS_REGISTRY_SYNC_EXPERIMENTAL")
		})
	})

})
