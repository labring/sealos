package e2e

import (
	"fmt"

	"github.com/labring/sealos/test/e2e/testhelper/utils"

	"github.com/labring/sealos/test/e2e/suites/operators"

	"github.com/labring/image-cri-shim/pkg/server"
	shimType "github.com/labring/image-cri-shim/pkg/types"
	"github.com/onsi/ginkgo/v2"
	k8sv1alpha2api "k8s.io/cri-api/pkg/apis/runtime/v1alpha2"

	"github.com/labring/sealos/pkg/utils/exec"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/test/e2e/suites/image"
)

const (
	//_defaultImageBenchmarkTimeoutSeconds = 10

	// defaultImageListingPrefix is for avoiding Docker Hub's rate limit
	defaultImageListingPrefix = "public.ecr.aws/docker/library/"
)

//	var defaultImageListingBenchmarkImagesAmd64 = []string{
//		defaultImageListingPrefix + "busybox:1.35.0-glibc",
//		defaultImageListingPrefix + "busybox:1-uclibc",
//		defaultImageListingPrefix + "busybox:1",
//		defaultImageListingPrefix + "busybox:1-glibc",
//		defaultImageListingPrefix + "busybox:1-musl",
//	}
var defaultImageListingBenchmarkImages = []string{
	defaultImageListingPrefix + "busybox:1",
	defaultImageListingPrefix + "busybox:1-glibc",
	defaultImageListingPrefix + "busybox:1-musl",
	"docker.io/library/busybox:1.28",
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
	ginkgo.BeforeEach(func() {
		//checkout image-cri-shim status running
		sealFile := `FROM labring/kubernetes:v1.25.0
COPY image-cri-shim cri`
		err = utils.WriteFile("Dockerfile", []byte(sealFile))
		utils.CheckErr(err)
		err = fakeClient.Image.BuildImage("kubernetes-hack:v1.25.0", ".", operators.BuildOptions{})
		utils.CheckErr(err)
		err = fakeClient.Cluster.Run("kubernetes-hack:v1.25.0")
		utils.CheckErr(err)
	})
	ginkgo.AfterEach(func() {
		clt.Close()
	})
	ginkgo.It("test image-cri-shim image service", func() {

		ginkgo.By("check service is running", func() {
			_, err = exec.RunSimpleCmd(fmt.Sprintf(CheckServiceFormatCommand, "image-cri-shim"))
			utils.CheckErr(err, "image-cri-shim service not exist, skip image-cri-shim test")
			shimConfig, err := shimType.Unmarshal(DefaultImageCRIShimConfig)
			utils.CheckErr(err, fmt.Sprintf("failed to unmarshal image shim config from /etc/image-cri-shim.yaml: %v", err))
			shimAuth, err := shimConfig.PreProcess()
			utils.CheckErr(err)
			clt, err = server.NewClient(server.CRIClientOptions{ImageSocket: shimConfig.ImageShimSocket})
			utils.CheckErr(err, fmt.Sprintf("failed to get new shim client: %v", err))
			gCon, err := clt.Connect(server.ConnectOptions{Wait: true})
			utils.CheckErr(err, fmt.Sprintf("failed to get connect shim client: %v", err))
			imageShimService = image.NewFakeImageServiceClientWithV1alpha2(k8sv1alpha2api.NewImageServiceClient(gCon), shimAuth)

		})

		ginkgo.By("list image", func() {
			images, err := imageShimService.ListImages()
			utils.CheckErr(err, fmt.Sprintf("failed to list images: %v", err))
			logger.Info("list images: %v", images)
		})

		ginkgo.By("pull image from remote", func() {
			for _, image := range defaultImageListingBenchmarkImages {
				id, err := imageShimService.PullImage(image)
				utils.CheckErr(err, fmt.Sprintf("failed to pull image %s: %v", image, err))
				logger.Info("pull images %s success, return image id %s \n", image, id)
			}
		})

		ginkgo.By("image status test", func() {
			for _, imageName := range defaultImageListingBenchmarkImages {
				img, err := imageShimService.ImageStatus(imageName)
				utils.CheckErr(err, fmt.Sprintf("failed to get image %s status: %v", imageName, err))
				logger.Info("get images %s success: %#+v \n", imageName, img)
			}

		})

		ginkgo.By("remove image", func() {
			for _, imageName := range defaultImageListingBenchmarkImages {
				err := imageShimService.RemoveImage(imageName)
				utils.CheckErr(err, fmt.Sprintf("failed to remove image %s: %v", imageName, err))
				logger.Info("remove images %s success \n", imageName)
			}
			for _, imageName := range defaultImageListingBenchmarkImages {
				img, err := imageShimService.ImageStatus(imageName)
				logger.Info("test get remove images %s status: %#+v , err: %v \n", imageName, img, err)
			}
		})

		ginkgo.By("image fs info", func() {
			fss, err := imageShimService.ImageFsInfo()
			utils.CheckErr(err, fmt.Sprintf("failed to get image fs info: %v", err))
			ginkgo.By("success get fs info: ")
			for i := range fss {
				logger.Info("fs usage mount point: %s", fss[i].GetFsId().GetMountpoint())
			}
		})
	})

})
