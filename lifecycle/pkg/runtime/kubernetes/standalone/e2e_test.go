// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package standalone

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"testing"

	"sigs.k8s.io/yaml"
)

// Activation is a test fixture for a disposable kubeadm host, not a lifecycle
// conversion command. It must be invoked separately before TestRunE2E.
func TestActivateStandaloneE2E(t *testing.T) {
	if os.Getenv("SEALOS_STANDALONE_ACTIVATE_E2E") != "1" {
		t.Skip("requires explicit activation of a disposable control plane")
	}
	config, err := exec.Command(
		"kubectl", "--kubeconfig=/etc/kubernetes/admin.conf",
		"-n", "kube-system", "get", "configmap", "kubeadm-config",
		"-o", "jsonpath={.data.ClusterConfiguration}",
	).Output()
	if err != nil {
		t.Fatal(err)
	}
	components := []struct {
		name string
		key  string
	}{
		{
			name: "kubelet-config",
			key:  "kubelet",
		},
		{
			name: "kube-proxy",
			key:  "config\\.conf",
		},
	}
	for _, component := range components {
		data, err := exec.Command(
			"kubectl", "--kubeconfig=/etc/kubernetes/admin.conf",
			"-n", "kube-system", "get", "configmap", component.name,
			"-o", "jsonpath={.data."+component.key+"}",
		).Output()
		if err != nil {
			t.Fatal(err)
		}
		config = append(config, []byte("\n---\n")...)
		config = append(config, data...)
	}
	if err := os.WriteFile(os.Getenv("SEALOS_STANDALONE_CONFIG"), config, 0o600); err != nil {
		t.Fatal(err)
	}
	pidBytes, err := exec.Command("systemctl", "show", "--property=MainPID", "--value", "kubelet").Output()
	if err != nil {
		t.Fatal(err)
	}
	pid, err := strconv.Atoi(strings.TrimSpace(string(pidBytes)))
	if err != nil || pid <= 0 {
		t.Fatalf("kubelet is not running: %s", pidBytes)
	}
	cmdline, err := os.ReadFile(fmt.Sprintf("/proc/%d/cmdline", pid))
	if err != nil {
		t.Fatal(err)
	}
	argv := strings.Split(strings.TrimRight(string(cmdline), "\x00"), "\x00")
	var args []string
	for i := 1; i < len(argv); i++ {
		arg := argv[i]
		if arg == "--kubeconfig" || arg == "--bootstrap-kubeconfig" {
			i++
			continue
		}
		if strings.HasPrefix(arg, "--kubeconfig=") || strings.HasPrefix(arg, "--bootstrap-kubeconfig=") {
			continue
		}
		args = append(args, arg)
	}
	args, err = standaloneArgs(args)
	if err != nil {
		t.Fatal(err)
	}
	path := flagValue(args, "config")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	var kubelet map[string]interface{}
	if err := yaml.Unmarshal(data, &kubelet); err != nil {
		t.Fatal(err)
	}
	kubelet["rotateCertificates"] = false
	kubelet["serverTLSBootstrap"] = false
	kubelet["authentication"].(map[string]interface{})["webhook"].(map[string]interface{})["enabled"] = false
	kubelet["authorization"].(map[string]interface{})["mode"] = "AlwaysAllow"
	data, err = yaml.Marshal(kubelet)
	if err != nil {
		t.Fatal(err)
	}
	if out, err := exec.Command("systemctl", "stop", "kubelet").CombinedOutput(); err != nil {
		t.Fatalf("stop kubelet: %v: %s", err, out)
	}
	if err := os.WriteFile(path, data, 0o600); err != nil {
		t.Fatal(err)
	}
	service := "/etc/systemd/system/kubelet.service.d/98-standalone-test.conf"
	if err := os.MkdirAll(filepath.Dir(service), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(service, []byte(serviceOverride(args)), 0o644); err != nil {
		t.Fatal(err)
	}
	name, err := os.Hostname()
	if err != nil {
		t.Fatal(err)
	}
	if out, err := exec.Command("kubectl", "--kubeconfig=/etc/kubernetes/admin.conf", "delete", "node", name).CombinedOutput(); err != nil {
		t.Fatalf("remove fixture Node: %v: %s", err, out)
	}
	actions := [][]string{
		{"daemon-reload"},
		{"start", "kubelet"},
	}
	for _, action := range actions {
		if out, err := exec.Command("systemctl", action...).CombinedOutput(); err != nil {
			t.Fatalf("activate standalone kubelet: %v: %s", err, out)
		}
	}
}
