// Copyright © 2021 sealos.
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

package testhelper

import (
	"errors"
	"fmt"
	"io"
	"os/exec"

	"github.com/labring/sealos/test/testhelper/settings"

	"github.com/onsi/ginkgo"
	"github.com/onsi/gomega"
	"github.com/onsi/gomega/gexec"
)

// Start sealos cmd and return *gexec.Session
func Start(cmdLine string) (*gexec.Session, error) {
	if cmdLine == "" {
		return nil, errors.New("failed to start cmd, line is empty")
	}
	cmdLine = fmt.Sprintf("sudo -E %s", cmdLine)
	execCmd := exec.Command("/bin/bash", "-c", cmdLine) // #nosec
	_, err := io.WriteString(ginkgo.GinkgoWriter, fmt.Sprintf("%s\n", cmdLine))
	if err != nil {
		return nil, err
	}
	return gexec.Start(execCmd, ginkgo.GinkgoWriter, ginkgo.GinkgoWriter)
}

// RunCmdAndCheckResult start cmd and check expectedCode
func RunCmdAndCheckResult(cmdLine string, expectedCode int) *gexec.Session {
	sess, err := Start(cmdLine)
	gomega.Expect(err).NotTo(gomega.HaveOccurred())
	gomega.Eventually(sess, settings.MaxWaiteTime).Should(gexec.Exit(expectedCode))
	return sess
}
