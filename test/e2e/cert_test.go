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

	"github.com/labring/sealos/test/e2e/suites/cert"
	"github.com/labring/sealos/test/e2e/testhelper"
)

var _ = Describe("cert test", func() {
	var (
		fakeCertInterface cert.Interface
		err               error
	)
	fakeCertInterface = cert.NewCertClient()
	It("sealos cert suit", func() {
		By("sealos cert", func() {
			err = fakeCertInterface.Cert("test.sealoshub.io")
			testhelper.CheckErr(err, fmt.Sprintf("failed to generate new cert for domain(test.sealoshub.io): %v", err))
			err = fakeCertInterface.Verify("test.sealoshub.io")
			testhelper.CheckErr(err, fmt.Sprintf("failed to verify cert for domain(test.sealoshub.io): %v", err))
		})

	})

})
