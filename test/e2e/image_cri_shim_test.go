package e2e

import (
	"fmt"

	"github.com/labring/image-cri-shim/pkg/server"
	shimType "github.com/labring/image-cri-shim/pkg/types"
	"github.com/onsi/ginkgo/v2"
	k8sv1alpha2api "k8s.io/cri-api/pkg/apis/runtime/v1alpha2"

	"github.com/labring/sealos/pkg/utils/exec"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/test/e2e/suites/image"
	"github.com/labring/sealos/test/e2e/testhelper"
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

var _ = ginkgo.Describe("image-cri-shim test", func() {

	var (
		imageService image.FakeImageServiceClientInterface
		clt          server.Client
		err          error
	)
	ginkgo.BeforeEach(func() {
		//checkout image-cri-shim status running
		_, err = exec.RunSimpleCmd(fmt.Sprintf(CheckServiceFormatCommand, "image-cri-shim"))
		testhelper.CheckErr(err, "image-cri-shim service not exist, skip image-cri-shim test")
		shimConfig, err := shimType.Unmarshal(DefaultImageCRIShimConfig)
		testhelper.CheckErr(err, fmt.Sprintf("failed to unmarshal image shim config from /etc/image-cri-shim.yaml: %v", err))
		shimAuth, err := shimConfig.PreProcess()
		testhelper.CheckErr(err)
		clt, err = server.NewClient(server.CRIClientOptions{ImageSocket: shimConfig.ImageShimSocket})
		testhelper.CheckErr(err, fmt.Sprintf("failed to get new shim client: %v", err))
		gCon, err := clt.Connect(server.ConnectOptions{Wait: true})
		testhelper.CheckErr(err, fmt.Sprintf("failed to get connect shim client: %v", err))
		imageService = image.NewFakeImageServiceClientWithV1alpha2(k8sv1alpha2api.NewImageServiceClient(gCon), shimAuth)

	})
	ginkgo.AfterEach(func() {
		clt.Close()
	})
	ginkgo.It("test image-cri-shim image service", func() {

		ginkgo.By("list image", func() {
			images, err := imageService.ListImages()
			testhelper.CheckErr(err, fmt.Sprintf("failed to list images: %v", err))
			logger.Info("list images: %v", images)
		})

		ginkgo.By("pull image from remote", func() {
			for _, image := range defaultImageListingBenchmarkImages {
				id, err := imageService.PullImage(image)
				testhelper.CheckErr(err, fmt.Sprintf("failed to pull image %s: %v", image, err))
				logger.Info("pull images %s success, return image id %s \n", image, id)
			}
		})

		ginkgo.By("image status test", func() {
			for _, imageName := range defaultImageListingBenchmarkImages {
				img, err := imageService.ImageStatus(imageName)
				testhelper.CheckErr(err, fmt.Sprintf("failed to get image %s status: %v", imageName, err))
				logger.Info("get images %s success: %#+v \n", imageName, img)
			}

		})

		ginkgo.By("remove image", func() {
			for _, imageName := range defaultImageListingBenchmarkImages {
				err := imageService.RemoveImage(imageName)
				testhelper.CheckErr(err, fmt.Sprintf("failed to remove image %s: %v", imageName, err))
				logger.Info("remove images %s success \n", imageName)
			}
			for _, imageName := range defaultImageListingBenchmarkImages {
				img, err := imageService.ImageStatus(imageName)
				logger.Info("test get remove images %s status: %#+v , err: %v \n", imageName, img, err)
			}
		})

		ginkgo.By("image fs info", func() {
			fss, err := imageService.ImageFsInfo()
			testhelper.CheckErr(err, fmt.Sprintf("failed to get image fs info: %v", err))
			ginkgo.By("success get fs info: ")
			for i := range fss {
				logger.Info("fs usage mount point: %s", fss[i].GetFsId().GetMountpoint())
			}
		})
	})

})
