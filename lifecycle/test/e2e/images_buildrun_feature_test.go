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

	"github.com/labring/sealos/test/e2e/testhelper/utils"

	"github.com/labring/sealos/test/e2e/suites/operators"

	"github.com/labring/sealos/test/e2e/testhelper/config"

	. "github.com/onsi/ginkgo/v2"
)

var _ = Describe("E2E_sealos_images_buildrun_feature_test", func() {
	fakeClient := operators.NewFakeClient("")
	Context("sealos images build and run suit by sync feature", func() {
		It("images build image running cluster", func() {
			By("write dockerfile")
			_ = os.Setenv("SEALOS_REGISTRY_SYNC_EXPERIMENTAL", "true")
			dFile := config.RootfsDockerfile{
				Images:    []string{"docker.io/altinity/clickhouse-operator:0.18.4", "docker.io/altinity/metrics-exporter:0.18.4"},
				BaseImage: "labring/kubernetes:v1.25.0",
				Copys:     []string{"sealctl opt/"},
			}
			tmpdir, err := dFile.Write()
			utils.CheckErr(err, fmt.Sprintf("failed to create dockerfile: %v", err))

			By("copy sealctl to rootfs")
			err = fakeClient.CmdInterface.Copy("/tmp/sealctl", path.Join(tmpdir, "sealctl"))
			utils.CheckErr(err, fmt.Sprintf("failed to copy sealctl to rootfs: %v", err))

			By("build image")
			err = fakeClient.Image.BuildImage("test-build-image:rootfs-sealctl", tmpdir, operators.BuildOptions{
				MaxPullProcs: 5,
			})
			utils.CheckErr(err)

			images := []string{"test-build-image:rootfs-sealctl", "labring/helm:v3.8.2", "labring/calico:v3.24.1"}
			defer func() {
				err = fakeClient.Cluster.Reset()
				utils.CheckErr(err, fmt.Sprintf("failed to reset cluster run: %v", err))
				_ = os.Unsetenv("SEALOS_REGISTRY_SYNC_EXPERIMENTAL")
			}()
			cmd.SetDebug()
			err = fakeClient.Cluster.Run(images...)
			utils.CheckErr(err, fmt.Sprintf("failed to run images %v: %v", images, err))
			err = fakeClient.CRI.Pull("docker.io/altinity/clickhouse-operator:0.18.4")
			utils.CheckErr(err, fmt.Sprintf("failed to pull image docker.io/altinity/clickhouse-operator:0.18.4: %v", err))
			_, err = fakeClient.CRI.ImageList()
			utils.CheckErr(err, fmt.Sprintf("failed to list images: %v", err))
			err = fakeClient.CRI.HasImage("sealos.hub:5000/altinity/clickhouse-operator:0.18.4")
			utils.CheckErr(err, fmt.Sprintf("failed to validate image sealos.hub:5000/altinity/clickhouse-operator:0.18.4: %v", err))
		})

	})
})
