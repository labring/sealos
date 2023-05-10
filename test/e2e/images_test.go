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

	"github.com/labring/sealos/test/e2e/testhelper/utils"

	"github.com/labring/sealos/test/e2e/suites/operators"

	"github.com/labring/sealos/test/e2e/testhelper/config"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
)

var _ = Describe("E2E_sealos_images_test", func() {
	var (
		err        error
		fakeClient *operators.FakeClient
	)
	fakeClient = operators.NewFakeClient("")
	Context("sealos images basic suit", func() {
		It("images pull", func() {
			err = fakeClient.Image.PullImage("docker.io/labring/kubernetes:v1.20.0")
			utils.CheckErr(err, fmt.Sprintf("failed to pull image docker.io/labring/kubernetes:v1.20.0: %v", err))
			id, err := fakeClient.Image.FetchImageID("docker.io/labring/kubernetes:v1.20.0")
			utils.CheckErr(err, fmt.Sprintf("failed to fetch image id docker.io/labring/kubernetes:v1.20.0: %v", err))
			Expect(id).NotTo(BeEmpty())
		})
		It("images create local image", func() {
			_, err = fakeClient.Image.Create("docker.io/labring/kubernetes:v1.20.0", false)
			utils.CheckErr(err, fmt.Sprintf("failed to create image docker.io/labring/kubernetes:v1.20.0: %v", err))
		})
		It("images create remote image", func() {
			_, err = fakeClient.Image.Create("docker.io/labring/kubernetes:v1.20.1", false)
			utils.CheckErr(err, fmt.Sprintf("failed to create image docker.io/labring/kubernetes:v1.20.1: %v", err))
		})
		It("images create remote image by short", func() {
			_, err = fakeClient.Image.Create("docker.io/labring/kubernetes:v1.20.2", true)
			utils.CheckErr(err, fmt.Sprintf("failed to create image docker.io/labring/kubernetes:v1.20.2: %v", err))
		})
		It("images more image", func() {
			err = fakeClient.Image.PullImage("docker.io/labring/kubernetes:v1.20.3", "labring/helm:v3.8.2")
			utils.CheckErr(err, fmt.Sprintf("failed to pull image docker.io/labring/kubernetes:v1.20.3 labring/helm:v3.8.2: %v", err))
		})
		It("images rm more image", func() {
			err = fakeClient.Image.RemoveImage("docker.io/labring/kubernetes:v1.20.3", "labring/helm:v3.8.2")
			utils.CheckErr(err, fmt.Sprintf("failed to remove image docker.io/labring/kubernetes:v1.20.3 labring/helm:v3.8.2: %v", err))
		})
		It("images save image", func() {
			err = fakeClient.Image.SaveImage("docker.io/labring/kubernetes:v1.20.1", "k8s.tar")
			utils.CheckErr(err, fmt.Sprintf("failed to save image docker.io/labring/kubernetes:v1.20.1: %v", err))
		})
		It("images load image", func() {
			err = fakeClient.Image.LoadImage("k8s.tar")
			utils.CheckErr(err, fmt.Sprintf("failed to load image k8s.tar: %v", err))
		})
		It("images merge image", func() {
			err = fakeClient.Image.Merge("new:0.1.0", []string{"docker.io/labring/kubernetes:v1.20.1", "labring/helm:v3.8.2"})
			utils.CheckErr(err, fmt.Sprintf("failed to merge image new:0.1.0: %v", err))
			_, err := fakeClient.Image.ListImages(true)
			utils.CheckErr(err, fmt.Sprintf("failed to list images: %v", err))
		})

	})
	Context("sealos images build suit", func() {
		var tmpdir string
		BeforeEach(func() {
			By("build image from dockerfile")
			dFile := config.Dockerfile{
				Images: []string{"docker.io/altinity/clickhouse-operator:0.18.4", "docker.io/altinity/metrics-exporter:0.18.4"},
			}
			tmpdir, err = dFile.Write()
			utils.CheckErr(err, fmt.Sprintf("failed to create dockerfile: %v", err))
		})
		AfterEach(func() {
			err = os.RemoveAll(tmpdir)
			utils.CheckErr(err, fmt.Sprintf("failed to remove dir %s: %v", tmpdir, err))
		})
		It("images build default image", func() {
			err = fakeClient.Image.BuildImage("test-build-image:clickhouse", tmpdir, operators.BuildOptions{
				MaxPullProcs: 5,
				SaveImage:    true,
			})
			utils.CheckErr(err)
		})
		It("images build Compress image", func() {
			err = fakeClient.Image.BuildImage("test-build-image:clickhouse-compress", tmpdir, operators.BuildOptions{
				Compression:  "gzip",
				MaxPullProcs: 5,
				SaveImage:    true,
			})
			utils.CheckErr(err)
		})
	})
	Context("sealos images build Compress and run suit", func() {
		It("images build Compress image running cluster", func() {

			By("write dockerfile")
			dFile := config.Dockerfile{
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
				Compression:  "gzip",
			})
			utils.CheckErr(err)

			images := []string{"test-build-image:rootfs-sealctl", "labring/helm:v3.8.2", "labring/calico:v3.24.1"}
			defer func() {
				err = fakeClient.Cluster.Reset()
				utils.CheckErr(err, fmt.Sprintf("failed to reset Compress cluster run: %v", err))
			}()
			err = fakeClient.Cluster.Run(images...)
			utils.CheckErr(err, fmt.Sprintf("failed to run Compress images %v: %v", images, err))
			err = fakeClient.CRI.Pull("docker.io/altinity/clickhouse-operator:0.18.4")
			utils.CheckErr(err, fmt.Sprintf("failed to pull image docker.io/altinity/clickhouse-operator:0.18.4: %v", err))
			err = fakeClient.CRI.ImageList()
			utils.CheckErr(err, fmt.Sprintf("failed to list images: %v", err))
			err = fakeClient.CRI.HasImage("sealos.hub:5000/altinity/clickhouse-operator:0.18.4")
			utils.CheckErr(err, fmt.Sprintf("failed to validate image sealos.hub:5000/altinity/clickhouse-operator:0.18.4: %v", err))
		})

	})
})
