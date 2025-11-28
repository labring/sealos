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
	"sync"
	"time"

	"github.com/labring/image-cri-shim/pkg/server"
	shimType "github.com/labring/image-cri-shim/pkg/types"
	"github.com/labring/sealos/pkg/utils/exec"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/test/e2e/suites/image"
	"github.com/labring/sealos/test/e2e/suites/operators"
	"github.com/labring/sealos/test/e2e/testhelper/utils"
	"github.com/onsi/ginkgo/v2"
	"github.com/onsi/gomega"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	k8sv1 "k8s.io/cri-api/pkg/apis/runtime/v1"
	"sigs.k8s.io/yaml"
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
	var (
		shimInitOnce sync.Once
		shimInitErr  error
	)
	ensureShimClient := func() {
		shimInitOnce.Do(func() {
			if _, err := exec.RunSimpleCmd(fmt.Sprintf(CheckServiceFormatCommand, "image-cri-shim")); err != nil {
				shimInitErr = fmt.Errorf("image-cri-shim service check failed: %w", err)
				return
			}
			var shimConfig *shimType.Config
			shimConfig, shimInitErr = shimType.Unmarshal(DefaultImageCRIShimConfig)
			if shimInitErr != nil {
				shimInitErr = fmt.Errorf("failed to unmarshal shim config: %w", shimInitErr)
				return
			}
			if _, err := shimConfig.PreProcess(); err != nil {
				shimInitErr = fmt.Errorf("failed to preprocess shim config: %w", err)
				return
			}
			clt, shimInitErr = server.NewClient(
				server.CRIClientOptions{ImageSocket: shimConfig.ImageShimSocket},
			)
			if shimInitErr != nil {
				shimInitErr = fmt.Errorf("failed to create shim client: %w", shimInitErr)
				return
			}
			gCon, err := clt.Connect(server.ConnectOptions{Wait: true})
			if err != nil {
				shimInitErr = fmt.Errorf("failed to connect shim client: %w", err)
				return
			}
			imageShimService = image.NewFakeImageServiceClientWithV1(
				k8sv1.NewImageServiceClient(gCon),
			)
		})
		utils.CheckErr(shimInitErr, "failed to initialize image shim client")
	}
	listTestCases := func() {
		images, err := imageShimService.ListImages()
		utils.CheckErr(err, fmt.Sprintf("failed to list images: %v", err))
		logger.Info("list images: %v", images)
	}
	pullTestCases := func() {
		for _, image := range defaultImageListingBenchmarkImages {
			id, err := imageShimService.PullImage(image)
			utils.CheckErr(err, fmt.Sprintf("failed to pull image %s: %v", image, err))
			logger.Info("pull images %s success, return image id %s \n", image, id)
		}
	}

	statusExitImagesTestCases := func() {
		for _, imageName := range defaultImageListingBenchmarkImages {
			img, err := imageShimService.ImageStatus(imageName)
			utils.CheckErr(err, fmt.Sprintf("failed to get image %s status: %v", imageName, err))
			gomega.Expect(img).NotTo(gomega.BeNil())
			gomega.Expect(img.Image).NotTo(gomega.BeNil())
			gomega.Expect(img.Image.Id).NotTo(gomega.BeEmpty())
			logger.Info("get images %s success: %s \n", imageName, img.Image.Id)
		}
	}

	pullAgainImagesTestCases := func() {
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
	statusNotExitImagesTestCases := func() {
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

	removeTestCases := func() {
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

	removeByIDTestCases := func() {
		id, err := imageShimService.PullImage("docker.io/labring/kubernetes-docker:v1.23.8")
		utils.CheckErr(
			err,
			fmt.Sprintf(
				"failed to pull image %s: %v",
				"docker.io/labring/kubernetes-docker:v1.23.8",
				err,
			),
		)
		logger.Info(
			"pull images %s success, return image id %s \n",
			"docker.io/labring/kubernetes-docker:v1.23.8",
			id,
		)
		err = imageShimService.RemoveImage(id)
		utils.CheckErr(err, fmt.Sprintf("failed to remove image %s: %v", id, err))
		logger.Info("remove images %s success \n", id)
	}

	statusByIDTestCases := func() {
		id, err := imageShimService.PullImage("docker.io/labring/kubernetes-docker:v1.23.8")
		utils.CheckErr(
			err,
			fmt.Sprintf(
				"failed to pull image %s: %v",
				"docker.io/labring/kubernetes-docker:v1.23.8",
				err,
			),
		)
		logger.Info(
			"pull images %s success, return image id %s \n",
			"docker.io/labring/kubernetes-docker:v1.23.8",
			id,
		)
		img, err := imageShimService.ImageStatus(id)
		utils.CheckErr(err, fmt.Sprintf("failed to get image %s status: %v", id, err))
		if img == nil || img.Image == nil || img.Image.Id == "" {
			utils.CheckErr(
				errors.New("image is not found"),
				fmt.Sprintf("failed to get image %s status: %+v", id, img),
			)
		} else {
			logger.Info("test get images by id  %s success\n", id)
		}
	}

	fsInfoTestCases := func() {
		fss, err := imageShimService.ImageFsInfo()
		utils.CheckErr(err, fmt.Sprintf("failed to get image fs info: %v", err))
		ginkgo.By("success get fs info: ")
		for i := range fss {
			logger.Info("fs usage mount point: %s", fss[i].GetFsId().GetMountpoint())
		}
	}
	ginkgo.Context("install cluster using hack image shim", func() {
		ginkgo.It("init cluster", func() {
			// checkout image-cri-shim status running
			sealFile := `FROM labring/kubernetes:v1.25.0
COPY image-cri-shim cri`
			err = utils.WriteFile("Dockerfile", []byte(sealFile))
			utils.CheckErr(err)
			err = fakeClient.Image.BuildImage(
				"kubernetes-hack:v1.25.0",
				".",
				operators.BuildOptions{},
			)
			utils.CheckErr(err)
			err = fakeClient.Cluster.Run("kubernetes-hack:v1.25.0")
			utils.CheckErr(err)
			err = fakeClient.CmdInterface.AsyncExec("crictl", "images")
			utils.CheckErr(err)
		})
	})
	ginkgo.Context("image-cri-shim basic lifecycle", func() {
		ginkgo.BeforeEach(ensureShimClient)

		ginkgo.It("lists images", listTestCases)
		ginkgo.It("pulls images from remote", pullTestCases)
		ginkgo.It("reports status for existing images", statusExitImagesTestCases)
		ginkgo.It("reports status by id", statusByIDTestCases)
		ginkgo.It("re-pulls existing images", pullAgainImagesTestCases)
		ginkgo.It("returns not-exist status", statusNotExitImagesTestCases)
		ginkgo.It("removes images", removeTestCases)
		ginkgo.It("removes images by id", removeByIDTestCases)
		ginkgo.It("lists filesystem info", fsInfoTestCases)
	})

	ginkgo.Context("image-cri-shim registry rewrite", func() {
		ginkgo.BeforeEach(ensureShimClient)

		ginkgo.It("syncs registry config from ConfigMap", func() {
			const (
				sourceImage    = "nginx:latest"
				rewrittenImage = "docker.m.daocloud.io/library/nginx:latest"
				mirrorAddress  = "https://docker.m.daocloud.io"
			)

			shimConfigRaw := utils.GetFileDataLocally(DefaultImageCRIShimConfig)
			defer func() {
				restoreSince := time.Now()
				writeShimConfig([]byte(shimConfigRaw))
				waitForShimLog("reloaded shim auth configuration", restoreSince, 60*time.Second)
			}()

			_, _ = fakeClient.CmdInterface.Exec(
				"kubectl",
				"-n",
				"kube-system",
				"delete",
				"configmap",
				"image-cri-shim",
				"--ignore-not-found=true",
			)

			configMapManifest := fmt.Sprintf(`apiVersion: v1
kind: ConfigMap
metadata:
  name: image-cri-shim
  namespace: kube-system
data:
  registries.yaml: |
    version: v1
    reloadInterval: 2s
    registries:
    - address: %s
`, mirrorAddress)

			configMapFile := utils.CreateTempFile()
			defer func() {
				utils.RemoveTempFile(configMapFile)
			}()
			utils.CheckErr(
				utils.WriteFile(configMapFile, []byte(configMapManifest)),
				"failed to write ConfigMap manifest",
			)

			_, err := fakeClient.CmdInterface.Exec("kubectl", "apply", "-f", configMapFile)
			utils.CheckErr(err, "failed to apply image-cri-shim ConfigMap")

			gomega.Eventually(func() string {
				out, err := exec.RunSimpleCmd("sudo cat " + DefaultImageCRIShimConfig)
				if err != nil {
					return ""
				}
				return out
			}, 90*time.Second, 3*time.Second).Should(gomega.ContainSubstring(mirrorAddress))

			gomega.Eventually(func() string {
				out, err := exec.RunSimpleCmd("sudo cat " + DefaultImageCRIShimConfig)
				if err != nil {
					return ""
				}
				return out
			}, 90*time.Second, 3*time.Second).Should(gomega.ContainSubstring("reloadInterval: 2s"))

			_, _ = fakeClient.CmdInterface.Exec("crictl", "rmi", sourceImage)
			_, _ = fakeClient.CmdInterface.Exec("crictl", "rmi", rewrittenImage)

			pullOut, err := fakeClient.CmdInterface.Exec("crictl", "pull", sourceImage)
			utils.CheckErr(err, fmt.Sprintf("failed to pull %s: %v", sourceImage, err))
			logger.Info("crictl pull output: %s", string(pullOut))
			_, err = fakeClient.CmdInterface.Exec("crictl", "inspecti", rewrittenImage)
			utils.CheckErr(
				err,
				fmt.Sprintf("rewritten image %s not found in cri store", rewrittenImage),
			)
		})

		ginkgo.It("allows pulling through registry mirror", func() {
			const (
				sourceImage    = "nginx:latest"
				rewrittenImage = "docker.m.daocloud.io/library/nginx:latest"
				mirrorAddress  = "https://docker.m.daocloud.io"
			)

			shimConfigRaw := utils.GetFileDataLocally(DefaultImageCRIShimConfig)
			logger.Warn(shimConfigRaw)
			cfg, err := shimType.UnmarshalData([]byte(shimConfigRaw))
			utils.CheckErr(err, "failed to unmarshal original shim config")

			cfgCopy := *cfg
			cfgCopy.ReloadInterval = metav1.Duration{Duration: time.Second}
			cfgCopy.Registries = append(
				cfgCopy.Registries,
				shimType.Registry{Address: mirrorAddress},
			)
			payload, err := yaml.Marshal(cfgCopy)
			utils.CheckErr(err, "failed to marshal shim config with mirror")

			defer func(content string) {
				restoreSince := time.Now()
				writeShimConfig([]byte(content))
				waitForShimLog("reloaded shim auth configuration", restoreSince, 60*time.Second)
			}(shimConfigRaw)

			writeShimConfig(payload)
			_, _ = fakeClient.CmdInterface.Exec("crictl", "rmi", sourceImage)
			_, _ = fakeClient.CmdInterface.Exec("crictl", "rmi", rewrittenImage)

			pullOut, err := fakeClient.CmdInterface.Exec("crictl", "pull", sourceImage)
			utils.CheckErr(err, fmt.Sprintf("failed to pull %s: %v", sourceImage, err))
			logger.Info("crictl pull output: %s", string(pullOut))
			_, err = fakeClient.CmdInterface.Exec("crictl", "inspecti", rewrittenImage)
			utils.CheckErr(
				err,
				fmt.Sprintf("rewritten image %s not found in cri store", rewrittenImage),
			)
		})
	})
})

const shimJournalTimeLayout = time.DateTime

func writeShimConfig(data []byte) {
	cmd := fmt.Sprintf(
		"cat <<'EOF' | sudo tee %s >/dev/null\n%s\nEOF",
		DefaultImageCRIShimConfig,
		string(data),
	)
	_, err := exec.RunSimpleCmd(cmd)
	utils.CheckErr(err, "failed to write shim config")
}

func waitForShimLog(fragment string, since time.Time, timeout time.Duration) {
	gomega.Eventually(func() string {
		cmd := fmt.Sprintf(
			"sudo journalctl -u image-cri-shim --since \"%s\" --no-pager",
			since.Add(-60*time.Second).Format(shimJournalTimeLayout),
		)
		out, err := exec.RunSimpleCmd(cmd)
		if err != nil {
			return ""
		}
		return out
	}, timeout, 3*time.Second).Should(gomega.ContainSubstring(fragment), fmt.Sprintf("missing shim log fragment %q", fragment))
}
