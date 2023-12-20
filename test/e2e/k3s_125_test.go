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
	"errors"
	"fmt"
	"path"
	"strings"
	"time"

	"github.com/google/go-containerregistry/pkg/name"

	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/util/yaml"

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/labring/sealos/test/e2e/suites/operators"
	"github.com/labring/sealos/test/e2e/testhelper/config"
	"github.com/labring/sealos/test/e2e/testhelper/utils"

	. "github.com/onsi/ginkgo/v2"
)

var _ = Describe("E2E_sealos_k3s_basic_test", func() {
	var (
		fakeClient *operators.FakeClient
		err        error
	)
	fakeClient = operators.NewFakeClient("")

	Context("sealos k3s suit", func() {
		BeforeEach(func() {
			By("build rootfs")
			dFile := config.RootfsDockerfile{
				BaseImage: "labring/k3s:v1.25-latest",
				Copys:     []string{"sealctl opt/"},
			}
			tmpdir, err := dFile.Write()
			utils.CheckErr(err, fmt.Sprintf("failed to create dockerfile: %v", err))

			By("copy sealctl to rootfs")
			err = fakeClient.CmdInterface.Copy("/tmp/sealctl", path.Join(tmpdir, "sealctl"))
			utils.CheckErr(err, fmt.Sprintf("failed to copy sealctl to rootfs: %v", err))

			By("build image")
			err = fakeClient.Image.BuildImage("k3s:buildin", tmpdir, operators.BuildOptions{
				MaxPullProcs: 5,
			})
			utils.CheckErr(err, fmt.Sprintf("failed to build image: %v", err))
		})
		AfterEach(func() {
			err = fakeClient.Cluster.Reset()
			utils.CheckErr(err, fmt.Sprintf("failed to reset cluster for single: %v", err))
		})
		It("sealos normal filesystem suit", func() {
			By("run k3s for normal")
			err = fakeClient.Cluster.Run("k3s:buildin")
			utils.CheckErr(err)
			fn := func() []byte {
				data, err := fakeClient.CmdInterface.Exec("kubectl", "get", "pods", "-A", "--kubeconfig", "/etc/rancher/k3s/k3s.yaml", "-o", "yaml")
				utils.CheckErr(err)
				return data
			}
			count := 0
			for {
				pods := fn()
				podList := &v1.PodList{}
				_ = yaml.Unmarshal(pods, podList)
				running := 0
				for _, pod := range podList.Items {
					logger.Info("k3s pods is: %s: %s", pod.Name, pod.Status.Phase)
					if pod.Status.Phase == v1.PodRunning {
						running++
					}
				}
				if running == len(podList.Items) && running != 0 {
					break
				}
				time.Sleep(2 * time.Second)
				logger.Info("k3s pods is empty,retry %d", count+1)
				count++
				if count == 20 {
					utils.CheckErr(errors.New("k3s pods is empty, for timeout"))
				}
			}
			err = fakeClient.CmdInterface.AsyncExec("kubectl", "get", "nodes", "--kubeconfig", "/etc/rancher/k3s/k3s.yaml")
			utils.CheckErr(err)
			displayImages, err := fakeClient.CRI.ImageList()
			utils.CheckErr(err)
			if displayImages != nil {
				for _, image := range displayImages.Images {
					for _, tag := range image.RepoTags {
						logger.Info("image tag is %s", tag)
						ref, err := name.ParseReference(tag)
						utils.CheckErr(err)
						logger.Info("image registry is %s", ref.Context().RegistryStr())
						if ref.Context().RegistryStr() != "sealos.hub:5000" {
							utils.CheckErr(fmt.Errorf("crictl image is not sealos.hub, %+v", strings.TrimSpace(tag)))
						}
					}
				}
			}
		})
	})

})
