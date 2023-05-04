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

	. "github.com/onsi/ginkgo/v2"

	"github.com/labring/sealos/test/e2e/suites/run"
	"github.com/labring/sealos/test/e2e/testhelper"
)

var _ = Describe("run test", func() {
	var (
		fakeRunInterface run.Interface
		err              error
	)
	fakeRunInterface = run.NewFakeSingleClient()
	Context("sealos run suit", func() {
		It("sealos run single", func() {
			images := []string{"labring/kubernetes:v1.25.0", "labring/helm:v3.8.2", "labring/calico:v3.24.1"}
			err = fakeRunInterface.Run(images...)
			testhelper.CheckErr(err, fmt.Sprintf("failed to Run new cluster for single: %v", err))
			err = fakeRunInterface.Verify(images...)
			testhelper.CheckErr(err, fmt.Sprintf("failed to verify run cluster for single: %v", err))
		})

	})

})
