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
	"time"

	"github.com/labring/sealos/test/e2e/suites/cluster"

	"github.com/labring/sealos/test/e2e/suites/run"

	. "github.com/onsi/ginkgo/v2"

	"github.com/labring/sealos/test/e2e/suites/cert"
	"github.com/labring/sealos/test/e2e/testhelper"
)

var _ = Describe("E2E_sealos_cert_test", func() {
	var (
		fakeCertInterface    cert.Interface
		fakeRunInterface     run.Interface
		fakeClusterInterface cluster.Interface
		err                  error
	)
	fakeCertInterface = cert.NewCertClient()
	fakeRunInterface = run.NewFakeSingleClient()
	BeforeEach(func() {
		images := []string{"labring/kubernetes:v1.25.0", "labring/helm:v3.8.2", "labring/calico:v3.24.1"}
		err = fakeRunInterface.Run(images...)
		testhelper.CheckErr(err, fmt.Sprintf("failed to Run new cluster for single: %v", err))
		fakeClusterInterface, err = cluster.NewFakeGroupClient("default", nil)
		testhelper.CheckErr(err, fmt.Sprintf("failed to get cluster interface: %v", err))
	})
	AfterEach(func() {
		err = fakeRunInterface.Reset()
		testhelper.CheckErr(err, fmt.Sprintf("failed to reset cluster for single: %v", err))
	})
	It("sealos cert suit", func() {
		err = fakeCertInterface.Cert("test.sealoshub.io")
		testhelper.CheckErr(err, fmt.Sprintf("failed to generate new cert for domain(test.sealoshub.io): %v", err))
		err = fakeCertInterface.Verify("test.sealoshub.io")
		testhelper.CheckErr(err, fmt.Sprintf("failed to verify cert for domain(test.sealoshub.io): %v", err))
		time.Sleep(10 * time.Second)
		err = fakeClusterInterface.Verify()
		testhelper.CheckErr(err, fmt.Sprintf("failed to verify cluster for single: %v", err))

	})

})
