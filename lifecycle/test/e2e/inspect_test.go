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

	"github.com/labring/sealos/test/e2e/testhelper/utils"

	"github.com/labring/sealos/test/e2e/suites/operators"

	. "github.com/onsi/ginkgo/v2"
)

var _ = Describe("E2E_sealos_inspect_test", func() {
	var (
		fakeClient *operators.FakeClient
		err        error
	)
	fakeClient = operators.NewFakeClient("")
	Context("sealos local image", func() {
		It("inspect image", func() {
			By("sealos pull image")
			err = fakeClient.Image.PullImage("labring/kubernetes:v1.23.8")
			utils.CheckErr(err, fmt.Sprintf("failed to pull image labring/kubernetes:v1.23.8: %v", err))
			By("sealos inspect local image")
			err = fakeClient.Inspect.LocalImage("labring/kubernetes:v1.23.8")
			utils.CheckErr(err, fmt.Sprintf("failed to inspect local image labring/kubernetes:v1.23.8: %v", err))
		})

	})
	Context("sealos remote image", func() {
		It("inspect image", func() {
			By("sealos inspect remote image")
			err = fakeClient.Inspect.RemoteImage("labring/kubernetes:v1.25.0")
			utils.CheckErr(err, fmt.Sprintf("failed to inspect remote image labring/kubernetes:v1.25.0: %v", err))
		})
	})

	Context("sealos inspect archive", func() {
		It("inspect image", func() {
			By("sealos save docker image")
			err = fakeClient.Image.PullImage("alpine:3")
			utils.CheckErr(err, fmt.Sprintf("failed to pull image alpine:3: %v", err))
			err = fakeClient.Image.DockerArchiveImage("alpine:3")
			utils.CheckErr(err, fmt.Sprintf("failed to save docker image alpine:3: %v", err))
			By("sealos save oci image")
			err = fakeClient.Image.OCIArchiveImage("alpine:3")
			utils.CheckErr(err, fmt.Sprintf("failed to save oci image alpine:3: %v", err))
			By("sealos inspect archive image")
			err = fakeClient.Inspect.DockerArchiveImage(operators.DockerTarFile)
			utils.CheckErr(err, fmt.Sprintf("failed to inspect docker archive image alpine:3: %v", err))
			err = fakeClient.Inspect.OCIArchiveImage(operators.OCITarFile)
			utils.CheckErr(err, fmt.Sprintf("failed to inspect oci archive image alpine:3: %v", err))
		})
	})

	Context("sealos inspect image id", func() {
		It("inspect image", func() {
			By("sealos inspect image id")
			id, err := fakeClient.Image.FetchImageID("labring/kubernetes:v1.23.8")
			utils.CheckErr(err, fmt.Sprintf("failed to fetch image id labring/kubernetes:v1.23.8: %v", err))
			err = fakeClient.Inspect.ImageID(id)
			utils.CheckErr(err, fmt.Sprintf("failed to inspect image id %s: %v", id, err))
		})
	})

})
