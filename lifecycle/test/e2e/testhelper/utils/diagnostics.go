// Copyright © 2026 sealos.
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

package utils

import (
	"context"
	"os/exec"
	"time"

	"github.com/labring/sealos/pkg/utils/logger"
)

// Capture the runner before AfterEach removes the failed cluster's processes.
func logHostDiagnostics() {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	logDiagnosticCommand(exec.CommandContext(
		ctx,
		"ss",
		"-tanp",
		"( sport = :2379 or sport = :2380 or sport = :6443 or sport = :10250 or sport = :10257 or sport = :10259 )",
	))
	logDiagnosticCommand(exec.CommandContext(ctx, "systemctl", "show", "kubelet",
		"--property=ActiveState,SubState,MainPID"))
	logDiagnosticCommand(exec.CommandContext(ctx, "sysctl",
		"net.ipv4.ip_local_port_range", "net.ipv4.ip_local_reserved_ports"))
}

func logDiagnosticCommand(command *exec.Cmd) {
	output, err := command.CombinedOutput()
	logger.Warn("E2E host diagnostic %v: %v\n%s", command.Args, err, output)
}

// LogK3sDiagnostics captures startup failures before the test resets K3s.
func LogK3sDiagnostics() {
	ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer cancel()

	for _, resource := range []string{"nodes", "pods"} {
		logDiagnosticCommand(exec.CommandContext(ctx, "kubectl",
			"--kubeconfig=/etc/rancher/k3s/k3s.yaml", "--request-timeout=10s",
			"describe", resource, "--all-namespaces"))
	}
	logDiagnosticCommand(exec.CommandContext(ctx, "kubectl",
		"--kubeconfig=/etc/rancher/k3s/k3s.yaml", "--request-timeout=10s",
		"get", "events", "--all-namespaces", "--sort-by=.lastTimestamp"))
	logDiagnosticCommand(exec.CommandContext(ctx, "journalctl",
		"--unit=k3s", "--boot", "--no-pager", "--lines=150"))
}
