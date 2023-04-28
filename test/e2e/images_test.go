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
	"time"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"

	"github.com/labring/sealos/test/e2e/testhelper"
	"github.com/labring/sealos/test/e2e/testhelper/settings"
)

var _ = Describe("images test", func() {

	Context("sealos images suit", func() {
		It("images pull", func() {
			settings.E2EConfig.WaitTime = 600 * time.Second
			testhelper.RunCmdAndCheckResult("sudo sealos pull docker.io/labring/kubernetes:v1.20.0", 0)
			t := testhelper.RunCmdAndCheckResult("sudo sealos images", 0)
			data := t.Out.Contents()
			Expect(string(data)).To(ContainSubstring("docker.io/labring/kubernetes"))
			Expect(string(data)).To(ContainSubstring("v1.20.0"))
			testhelper.RunCmdAndCheckResult("sudo sealos create docker.io/labring/kubernetes:v1.20.0", 0)
			testhelper.RunCmdAndCheckResult("sudo sealos create docker.io/labring/kubernetes:v1.20.1", 0)
			testhelper.RunCmdAndCheckResult("sudo sealos create docker.io/labring/kubernetes:v1.20.2 --short", 0)
			testhelper.RunCmdAndCheckResult("sudo sealos pull docker.io/labring/kubernetes:v1.20.2 labring/helm:v3.8.2", 0)
			testhelper.RunCmdAndCheckResult("sudo sealos rmi -f docker.io/labring/kubernetes:v1.20.2 labring/helm:v3.8.2", 0)
			testhelper.RunCmdAndCheckResult("sudo sealos save -o k8s.tar docker.io/labring/kubernetes:v1.20.1", 0)
			testhelper.RunCmdAndCheckResult("sudo sealos save -o k8s.tar docker.io/labring/kubernetes:v1.20.1", 0)
			testhelper.RunCmdAndCheckResult("sudo sealos load -i k8s.tar", 0)
			t = testhelper.RunCmdAndCheckResult("sudo sealos merge -t new:0.1.0 docker.io/labring/kubernetes:v1.21.0 labring/helm:v3.8.2", 0)
			data = t.Out.Contents()
			Expect(string(data)).To(ContainSubstring("docker.io/labring/kubernetes"))
			Expect(string(data)).To(ContainSubstring("v1.21.0"))
			t = testhelper.RunCmdAndCheckResult("sudo sealos images", 0)
			data = t.Out.Contents()
			Expect(string(data)).To(ContainSubstring("new"))
			Expect(string(data)).To(ContainSubstring("0.1.0"))
		})

	})

})
