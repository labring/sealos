// Copyright © 2023 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package e2e

import (
	"errors"
	"fmt"
	"path/filepath"
	"time"

	"github.com/onsi/gomega"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/yaml"

	"github.com/labring/sealos/test/e2e/testhelper/utils"

	"github.com/labring/sealos/test/e2e/suites/operators"

	"github.com/labring/image-cri-shim/pkg/server"
	shimType "github.com/labring/image-cri-shim/pkg/types"
	"github.com/onsi/ginkgo/v2"
	k8sv1 "k8s.io/cri-api/pkg/apis/runtime/v1"

	"github.com/labring/sealos/pkg/utils/exec"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/test/e2e/suites/image"
)

const (
	// defaultImageListingPrefix is for avoiding Docker Hub's rate limit
	defaultImageListingPrefix = "public.ecr.aws/docker/library/"
)

var defaultImageListingBenchmarkImages = []string{
	defaultImageListingPrefix + "busybox:1",
	defaultImageListingPrefix + "busybox:1-glibc",
	defaultImageListingPrefix + "busybox:1-musl",
	"docker.io/library/busybox:1.28",
}
var defaultImageNotExsitBenchmarkImages = []string{
	"docker.io/library/kubernetes:v1.23.8",
}

const (
	DefaultImageCRIShimConfig = "/etc/image-cri-shim.yaml"
	CheckServiceFormatCommand = "systemctl is-active %s.service"
)

var _ = ginkgo.Describe("E2E_image-cri-shim_run_test", func() {

	var (
		imageShimService image.FakeImageCRIShimInterface
		clt              server.Client
		err              error
		fakeClient       *operators.FakeClient
	)
	fakeClient = operators.NewFakeClient("")
	var listTestCases = func() {
		images, err := imageShimService.ListImages()
		utils.CheckErr(err, fmt.Sprintf("failed to list images: %v", err))
		logger.Info("list images: %v", images)
	}
	var pullTestCases = func() {
		for _, image := range defaultImageListingBenchmarkImages {
			id, err := imageShimService.PullImage(image)
			utils.CheckErr(err, fmt.Sprintf("failed to pull image %s: %v", image, err))
			logger.Info("pull images %s success, return image id %s \n", image, id)
		}
	}

	var statusExitImagesTestCases = func() {
		for _, imageName := range defaultImageListingBenchmarkImages {
			img, err := imageShimService.ImageStatus(imageName)
			utils.CheckErr(err, fmt.Sprintf("failed to get image %s status: %v", imageName, err))
			gomega.Expect(img).NotTo(gomega.BeNil())
			gomega.Expect(img.Image).NotTo(gomega.BeNil())
			gomega.Expect(img.Image.Id).NotTo(gomega.BeEmpty())
			logger.Info("get images %s success: %s \n", imageName, img.Image.Id)
		}
	}

	var pullAgainImagesTestCases = func() {
		err = fakeClient.CmdInterface.AsyncExec("crictl", "images")
		utils.CheckErr(err)
		for _, imageName := range defaultImageListingBenchmarkImages {
			_, err := imageShimService.ImageStatus(imageName)
			utils.CheckErr(err, fmt.Sprintf("failed to get image %s status: %v", imageName, err))
			id, err := imageShimService.PullImage(imageName)
			utils.CheckErr(err, fmt.Sprintf("failed to pull image %s: %v", imageName, err))
			logger.Info("pull images %s success, return image id %s \n", imageName, id)
		}
		err = fakeClient.CmdInterface.AsyncExec("crictl", "images")
		utils.CheckErr(err)
	}
	var statusNotExitImagesTestCases = func() {
		for _, imageName := range defaultImageNotExsitBenchmarkImages {
			img, err := imageShimService.ImageStatus(imageName)
			utils.CheckErr(err, fmt.Sprintf("failed to get image %s status: %v", imageName, err))
			if img == nil || img.Image == nil || img.Image.Id == "" {
				logger.Info("get images %s success: not exists\n", imageName)
			} else {
				utils.CheckErr(errors.New("image is exists"), fmt.Sprintf("failed to get image %s status: %+v", imageName, img))
			}
		}
	}

	var removeTestCases = func() {
		for _, imageName := range defaultImageListingBenchmarkImages {
			err := imageShimService.RemoveImage(imageName)
			utils.CheckErr(err, fmt.Sprintf("failed to remove image %s: %v", imageName, err))
			logger.Info("remove images %s success \n", imageName)
		}
		for _, imageName := range defaultImageListingBenchmarkImages {
			img, err := imageShimService.ImageStatus(imageName)
			utils.CheckErr(err, fmt.Sprintf("failed to get image %s status: %v", imageName, err))
			if img == nil || img.Image == nil || img.Image.Id == "" {
				logger.Info("test get remove images %s success: not exists\n", imageName)
			} else {
				utils.CheckErr(errors.New("image is exists"), fmt.Sprintf("failed to get image %s status: %+v", imageName, img))
			}
		}
	}

	var removeByIDTestCases = func() {
		id, err := imageShimService.PullImage("docker.io/labring/kubernetes-docker:v1.23.8")
		utils.CheckErr(err, fmt.Sprintf("failed to pull image %s: %v", "docker.io/labring/kubernetes-docker:v1.23.8", err))
		logger.Info("pull images %s success, return image id %s \n", "docker.io/labring/kubernetes-docker:v1.23.8", id)
		err = imageShimService.RemoveImage(id)
		utils.CheckErr(err, fmt.Sprintf("failed to remove image %s: %v", id, err))
		logger.Info("remove images %s success \n", id)
	}

	var statusByIDTestCases = func() {
		id, err := imageShimService.PullImage("docker.io/labring/kubernetes-docker:v1.23.8")
		utils.CheckErr(err, fmt.Sprintf("failed to pull image %s: %v", "docker.io/labring/kubernetes-docker:v1.23.8", err))
		logger.Info("pull images %s success, return image id %s \n", "docker.io/labring/kubernetes-docker:v1.23.8", id)
		img, err := imageShimService.ImageStatus(id)
		utils.CheckErr(err, fmt.Sprintf("failed to get image %s status: %v", id, err))
		if img == nil || img.Image == nil || img.Image.Id == "" {
			utils.CheckErr(errors.New("image is not found"), fmt.Sprintf("failed to get image %s status: %+v", id, img))
		} else {
			logger.Info("test get images by id  %s success\n", id)
		}
	}

	var fsInfoTestCases = func() {
		fss, err := imageShimService.ImageFsInfo()
		utils.CheckErr(err, fmt.Sprintf("failed to get image fs info: %v", err))
		ginkgo.By("success get fs info: ")
		for i := range fss {
			logger.Info("fs usage mount point: %s", fss[i].GetFsId().GetMountpoint())
		}
	}
	ginkgo.Context("install cluster using hack image shim", func() {
		ginkgo.It("init cluster", func() {
			//checkout image-cri-shim status running
			sealFile := `FROM labring/kubernetes:v1.25.0
COPY image-cri-shim cri`
			err = utils.WriteFile("Dockerfile", []byte(sealFile))
			utils.CheckErr(err)
			err = fakeClient.Image.BuildImage("kubernetes-hack:v1.25.0", ".", operators.BuildOptions{})
			utils.CheckErr(err)
			err = fakeClient.Cluster.Run("kubernetes-hack:v1.25.0")
			utils.CheckErr(err)
			err = fakeClient.CmdInterface.AsyncExec("crictl", "images")
			utils.CheckErr(err)
		})
	})
	ginkgo.Context("image-cri-shim image service test using k8sv1", func() {
		ginkgo.It("check service is running", func() {
			_, err = exec.RunSimpleCmd(fmt.Sprintf(CheckServiceFormatCommand, "image-cri-shim"))
			utils.CheckErr(err, "image-cri-shim service not exist, skip image-cri-shim test")
			shimConfig, err := shimType.Unmarshal(DefaultImageCRIShimConfig)
			utils.CheckErr(err, fmt.Sprintf("failed to unmarshal image shim config from /etc/image-cri-shim.yaml: %v", err))
			_, err = shimConfig.PreProcess()
			utils.CheckErr(err)
			clt, err = server.NewClient(server.CRIClientOptions{ImageSocket: shimConfig.ImageShimSocket})
			utils.CheckErr(err, fmt.Sprintf("failed to get new shim client: %v", err))
			gCon, err := clt.Connect(server.ConnectOptions{Wait: true})
			utils.CheckErr(err, fmt.Sprintf("failed to get connect shim client: %v", err))
			imageShimService = image.NewFakeImageServiceClientWithV1(k8sv1.NewImageServiceClient(gCon))
		})

		ginkgo.It("list image", listTestCases)
		ginkgo.It("pull image from remote", pullTestCases)
		ginkgo.It("image status exists test", statusExitImagesTestCases)
		ginkgo.It("image status by id test", statusByIDTestCases)
		ginkgo.It("pull image from images again", pullAgainImagesTestCases)
		ginkgo.It("image status not exists test", statusNotExitImagesTestCases)
		ginkgo.It("remove image", removeTestCases)
		ginkgo.It("remove image by id", removeByIDTestCases)
		ginkgo.It("get fs info", fsInfoTestCases)
		ginkgo.It("rewrite registry config allows pulling via mirror", func() {
			const (
				sourceImage    = "docker.io/library/busybox:1"
				rewrittenImage = "registry-1.docker.io/library/busybox:1"
			)

			shimConfigRaw := utils.GetFileDataLocally(DefaultImageCRIShimConfig)
			cfg, err := shimType.UnmarshalData([]byte(shimConfigRaw))
			utils.CheckErr(err, "failed to unmarshal original shim config")

			cfgCopy := *cfg
			cfgCopy.Registries = append([]shimType.Registry{}, cfg.Registries...)
			cfgCopy.ReloadInterval = metav1.Duration{Duration: time.Second}
			mirrorConfigured := false
			for _, reg := range cfgCopy.Registries {
				if reg.Address == "https://registry-1.docker.io" || reg.Address == "registry-1.docker.io" {
					mirrorConfigured = true
					break
				}
			}
			if !mirrorConfigured {
				cfgCopy.Registries = append(cfgCopy.Registries, shimType.Registry{Address: "https://registry-1.docker.io"})
			}

			cfgCopy.Auth = fmt.Sprintf("offline:%d", time.Now().UnixNano())
			payload, err := yaml.Marshal(cfgCopy)
			utils.CheckErr(err, "failed to marshal shim config with mirror")

			defer func(content string) {
				restoreSince := time.Now()
				writeShimConfig([]byte(content))
				waitForShimLog("reloaded shim auth configuration", restoreSince, 60*time.Second)
			}(shimConfigRaw)

			since := time.Now()
			writeShimConfig(payload)
			waitForShimLog("reloaded shim auth configuration", since, 60*time.Second)

			registryDir := shimType.NormalizeRegistryDir(cfgCopy.RegistryDir)
			registryFile := filepath.Join(registryDir, "registry-1.docker.io.yaml")
			gomega.Eventually(func() error {
				_, err := exec.RunSimpleCmd(fmt.Sprintf("sudo test -f %s", registryFile))
				return err
			}, 30*time.Second, 2*time.Second).Should(gomega.Succeed(), fmt.Sprintf("expected registry config %s to exist", registryFile))

			registryData := utils.GetFileDataLocally(registryFile)
			gomega.Expect(registryData).To(gomega.ContainSubstring("https://registry-1.docker.io"))

			_, _ = fakeClient.CmdInterface.Exec("crictl", "rmi", sourceImage)
			_, _ = fakeClient.CmdInterface.Exec("crictl", "rmi", rewrittenImage)

			pullOut, err := fakeClient.CmdInterface.Exec("crictl", "pull", sourceImage)
			utils.CheckErr(err, fmt.Sprintf("failed to pull %s: %v", sourceImage, err))
			logger.Info("crictl pull output: %s", string(pullOut))

			waitForShimLog(fmt.Sprintf("image: %s, newImage: %s, action: PullImage", sourceImage, rewrittenImage), since, 60*time.Second)

			_, err = fakeClient.CmdInterface.Exec("crictl", "inspecti", rewrittenImage)
			utils.CheckErr(err, fmt.Sprintf("rewritten image %s not found in cri store", rewrittenImage))
		})
		ginkgo.It("close grpc", func() {
			clt.Close()
		})
	})

})

const shimJournalTimeLayout = "2006-01-02 15:04:05"

func writeShimConfig(data []byte) {
	cmd := fmt.Sprintf("cat <<'EOF' | sudo tee %s >/dev/null\n%s\nEOF", DefaultImageCRIShimConfig, string(data))
	_, err := exec.RunSimpleCmd(cmd)
	utils.CheckErr(err, "failed to write shim config")
}

func waitForShimLog(fragment string, since time.Time, timeout time.Duration) {
	gomega.Eventually(func() string {
		cmd := fmt.Sprintf("sudo journalctl -u image-cri-shim --since \"%s\" --no-pager", since.Add(-5*time.Second).Format(shimJournalTimeLayout))
		out, err := exec.RunSimpleCmd(cmd)
		if err != nil {
			return ""
		}
		return out
	}, timeout, 3*time.Second).Should(gomega.ContainSubstring(fragment), fmt.Sprintf("missing shim log fragment %q", fragment))
}
