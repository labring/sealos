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

	"github.com/labring/sealos/test/e2e/suites/cri"
	"github.com/labring/sealos/test/e2e/testhelper/config"

	"github.com/labring/sealos/test/e2e/suites/run"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"

	"github.com/labring/sealos/test/e2e/suites/image"

	"github.com/labring/sealos/test/e2e/testhelper"
)

var _ = Describe("E2E_sealos_images_test", func() {
	var (
		err                error
		fakeImageInterface image.FakeImageInterface
		fakeRunInterface   run.Interface
	)
	fakeImageInterface = image.NewFakeImage()
	fakeRunInterface = run.NewFakeSingleClient()
	Context("sealos images basic suit", func() {
		It("images pull", func() {
			err = fakeImageInterface.PullImage("docker.io/labring/kubernetes:v1.20.0")
			testhelper.CheckErr(err, fmt.Sprintf("failed to pull image docker.io/labring/kubernetes:v1.20.0: %v", err))
			id, err := fakeImageInterface.FetchImageID("docker.io/labring/kubernetes:v1.20.0")
			testhelper.CheckErr(err, fmt.Sprintf("failed to fetch image id docker.io/labring/kubernetes:v1.20.0: %v", err))
			Expect(id).NotTo(BeEmpty())
		})
		It("images create local image", func() {
			_, err = fakeImageInterface.Create("docker.io/labring/kubernetes:v1.20.0", false)
			testhelper.CheckErr(err, fmt.Sprintf("failed to create image docker.io/labring/kubernetes:v1.20.0: %v", err))
		})
		It("images create remote image", func() {
			_, err = fakeImageInterface.Create("docker.io/labring/kubernetes:v1.20.1", false)
			testhelper.CheckErr(err, fmt.Sprintf("failed to create image docker.io/labring/kubernetes:v1.20.1: %v", err))
		})
		It("images create remote image by short", func() {
			_, err = fakeImageInterface.Create("docker.io/labring/kubernetes:v1.20.2", true)
			testhelper.CheckErr(err, fmt.Sprintf("failed to create image docker.io/labring/kubernetes:v1.20.2: %v", err))
		})
		It("images more image", func() {
			err = fakeImageInterface.PullImage("docker.io/labring/kubernetes:v1.20.3", "labring/helm:v3.8.2")
			testhelper.CheckErr(err, fmt.Sprintf("failed to pull image docker.io/labring/kubernetes:v1.20.3 labring/helm:v3.8.2: %v", err))
		})
		It("images rm more image", func() {
			err = fakeImageInterface.RemoveImage("docker.io/labring/kubernetes:v1.20.3", "labring/helm:v3.8.2")
			testhelper.CheckErr(err, fmt.Sprintf("failed to remove image docker.io/labring/kubernetes:v1.20.3 labring/helm:v3.8.2: %v", err))
		})
		It("images save image", func() {
			err = fakeImageInterface.SaveImage("docker.io/labring/kubernetes:v1.20.1", "k8s.tar")
			testhelper.CheckErr(err, fmt.Sprintf("failed to save image docker.io/labring/kubernetes:v1.20.1: %v", err))
		})
		It("images load image", func() {
			err = fakeImageInterface.LoadImage("k8s.tar")
			testhelper.CheckErr(err, fmt.Sprintf("failed to load image k8s.tar: %v", err))
		})
		It("images merge image", func() {
			err = fakeImageInterface.Merge("new:0.1.0", []string{"docker.io/labring/kubernetes:v1.20.1", "labring/helm:v3.8.2"})
			testhelper.CheckErr(err, fmt.Sprintf("failed to merge image new:0.1.0: %v", err))
			_, err := fakeImageInterface.ListImages(true)
			testhelper.CheckErr(err, fmt.Sprintf("failed to list images: %v", err))
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
			testhelper.CheckErr(err, fmt.Sprintf("failed to create dockerfile: %v", err))
		})
		AfterEach(func() {
			err = os.RemoveAll(tmpdir)
			testhelper.CheckErr(err, fmt.Sprintf("failed to remove dir %s: %v", tmpdir, err))
		})
		It("images build default image", func() {
			err = fakeImageInterface.BuildImage("test-build-image:clickhouse", tmpdir, image.BuildOptions{
				Compress:     false,
				MaxPullProcs: 5,
				SaveImage:    true,
			})
			testhelper.CheckErr(err)
		})
		It("images build Compress image", func() {
			err = fakeImageInterface.BuildImage("test-build-image:clickhouse-compress", tmpdir, image.BuildOptions{
				Compress:     true,
				MaxPullProcs: 5,
				SaveImage:    true,
			})
			testhelper.CheckErr(err)
		})

		It("images build Compress image running cluster", func() {
			err = fakeImageInterface.BuildImage("test-build-image:clickhouse-compress-run", tmpdir, image.BuildOptions{
				Compress:     true,
				MaxPullProcs: 5,
				SaveImage:    true,
			})
			testhelper.CheckErr(err)

			images := []string{"labring/kubernetes:v1.25.0", "labring/helm:v3.8.2", "labring/calico:v3.24.1", "test-build-image:clickhouse-compress-run"}
			defer func() {
				err = fakeRunInterface.Reset()
				testhelper.CheckErr(err, fmt.Sprintf("failed to reset Compress cluster run: %v", err))
			}()
			err = fakeRunInterface.Run(images...)
			testhelper.CheckErr(err, fmt.Sprintf("failed to run Compress images %v: %v", images, err))
			criInterface := cri.NewCRIClient()
			err = criInterface.Pull("docker.io/altinity/clickhouse-operator:0.18.4")
			testhelper.CheckErr(err, fmt.Sprintf("failed to pull image docker.io/altinity/clickhouse-operator:0.18.4: %v", err))
			err = criInterface.ImageList()
			testhelper.CheckErr(err, fmt.Sprintf("failed to list images: %v", err))
			err = criInterface.HasImage("sealos.hub:5000/altinity/clickhouse-operator:0.18.4")
			testhelper.CheckErr(err, fmt.Sprintf("failed to validate image sealos.hub:5000/altinity/clickhouse-operator:0.18.4: %v", err))
		})

	})
})
