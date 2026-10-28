// Copyright © 2023 sealos.
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

package e2e

import (
	"os"
	"strings"
	"testing"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"

	"github.com/labring/sealos/test/e2e/testhelper/settings"
)

func TestSealosTest(t *testing.T) {
	RegisterFailHandler(Fail)
	RunSpecs(t, "e2e test for sealos")
}

var _ = SynchronizedBeforeSuite(func() []byte {
	// Cluster images expand the ephemeral port range to include service ports.
	// Keep image pulls from claiming those ports before kubeadm starts listeners.
	const reservedPortsPath = "/proc/sys/net/ipv4/ip_local_reserved_ports"
	previous, err := os.ReadFile(reservedPortsPath)
	Expect(err).NotTo(HaveOccurred())
	ports := "2379-2381,5000,5050-5054,6443,10249-10259"
	if existing := strings.TrimSpace(string(previous)); existing != "" {
		ports = existing + "," + ports
	}
	Expect(os.WriteFile(reservedPortsPath, []byte(ports+"\n"), 0o600)).To(Succeed())
	DeferCleanup(func() {
		Expect(os.WriteFile(reservedPortsPath, previous, 0o600)).To(Succeed())
	})
	SetDefaultEventuallyTimeout(settings.E2EConfig.WaitTime)
	return nil
}, func(data []byte) {
	SetDefaultEventuallyTimeout(settings.E2EConfig.WaitTime)
})
