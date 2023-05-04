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
	. "github.com/onsi/ginkgo/v2"

	"github.com/labring/sealos/test/e2e/suites/image"
	"github.com/labring/sealos/test/e2e/suites/inspect"
	"github.com/labring/sealos/test/e2e/testhelper"
)

var _ = Describe("inspect test", func() {
	var (
		fakeInspectInterface inspect.Interface
		err                  error
		fakeImageInterface   image.FakeImageInterface
	)
	fakeInspectInterface = inspect.NewInspectClient()
	fakeImageInterface = image.NewFakeImage()
	Context("sealos local image", func() {
		It("inspect image", func() {
			By("sealos pull image")
			err = fakeImageInterface.PullImage("labring/kubernetes:v1.23.8")
			testhelper.CheckErr(err, "failed to pull image labring/kubernetes:v1.23.8")
			By("sealos inspect local image")
			err = fakeInspectInterface.LocalImage("labring/kubernetes:v1.23.8")
			testhelper.CheckErr(err, "failed to inspect local image labring/kubernetes:v1.23.8")
		})

	})
	Context("sealos remote image", func() {
		It("inspect image", func() {
			By("sealos inspect remote image")
			err = fakeInspectInterface.RemoteImage("labring/kubernetes:v1.25.0")
			testhelper.CheckErr(err, "failed to inspect local image labring/kubernetes:v1.25.0")
		})
	})

	Context("sealos save", func() {
		It("inspect image before save image", func() {
			By("sealos save docker image")
			err = fakeImageInterface.DockerArchiveImage("alpine:3")
			testhelper.CheckErr(err, "failed to save docker image alpine:3")
			By("sealos save oci image")
			err = fakeImageInterface.OCIArchiveImage("alpine:3")
			testhelper.CheckErr(err, "failed to save oci image alpine:3")
		})
	})

	Context("sealos inspect archive", func() {
		It("inspect image", func() {
			By("sealos inspect archive image")
			err = fakeInspectInterface.DockerArchiveImage(image.DockerTarFile)
			testhelper.CheckErr(err, "failed to inspect docker archive image alpine:3")
			err = fakeInspectInterface.OCIArchiveImage(image.OCITarFile)
			testhelper.CheckErr(err, "failed to inspect oci archive image alpine:3")
		})
	})

	Context("sealos inspect image id", func() {
		It("inspect image", func() {
			By("sealos inspect image id")
			id, err := fakeInspectInterface.FetchImageID("labring/kubernetes:v1.23.8")
			testhelper.CheckErr(err, "failed to fetch image id labring/kubernetes:v1.23.8")
			err = fakeInspectInterface.ImageID(id)
			testhelper.CheckErr(err, "failed to inspect image id labring/kubernetes:v1.23.8")
		})
	})

})
