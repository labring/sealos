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

	"github.com/labring/sealos/test/e2e/suites/operators"
	"github.com/labring/sealos/test/e2e/testhelper/utils"

	. "github.com/onsi/ginkgo/v2"
)

var _ = Describe("E2E_sealos_runtime_version_125_test", func() {
	var (
		fakeClient *operators.FakeClient
		err        error
	)
	fakeClient = operators.NewFakeClient("")

	Context("sealos run for many version", func() {
		It("sealos apply single by containerd v1.25.0", func() {
			images := []string{"labring/kubernetes:v1.25.0"}
			defer func() {
				err = fakeClient.Cluster.Reset()
				utils.CheckErr(err, fmt.Sprintf("failed to reset cluster run: %v", err))
			}()
			err = fakeClient.Cluster.Run(images...)
			utils.CheckErr(err, fmt.Sprintf("failed to run images %v: %v", images, err))
			err = checkVersionImageList(fakeClient)
			utils.CheckErr(err, fmt.Sprintf("failed to check version image list: %v", err))
		})
	})

})
