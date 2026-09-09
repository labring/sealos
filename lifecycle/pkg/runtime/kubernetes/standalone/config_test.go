// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package standalone

import (
	"bytes"
	"context"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	v1 "k8s.io/api/core/v1"
	utilyaml "k8s.io/apimachinery/pkg/util/yaml"
)

func TestValidateVersionChange(t *testing.T) {
	tests := []struct {
		current string
		target  string
		valid   bool
	}{
		{"v1.30.3", "v1.30.3", true},
		{"v1.30.3", "v1.30.9", true},
		{"v1.30.3", "v1.31.0", true},
		{"v1.35.1", "v1.36.0", true},
		{"v1.30.3", "v1.30.2", false},
		{"v1.30.3", "v1.32.0", false},
		{"v1.30.3", "v2.0.0", false},
		{"v1.28.15", "v1.28.15", true},
		{"v1.28.15", "v1.29.9", true},
		{"v1.28.15", "v1.30.3", false},
		{"v1.27.16", "v1.28.15", false},
		{"v1.29.9", "v1.30.3", true},
		{"v1.30.3", "v1.31.0-alpha.1", false},
		{"invalid", "v1.31.0", false},
	}
	for _, tt := range tests {
		t.Run(tt.current+"-"+tt.target, func(t *testing.T) {
			if err := ValidateVersionChange(tt.current, tt.target); (err == nil) != tt.valid {
				t.Fatalf("valid=%t, got %v", tt.valid, err)
			}
		})
	}
}

func TestRejectRegisteredKubelet(t *testing.T) {
	for _, args := range [][]string{
		{"--config=/var/lib/kubelet/config.yaml", "--kubeconfig=/etc/kubernetes/kubelet.conf"},
		{"--config", "/var/lib/kubelet/config.yaml", "--bootstrap-kubeconfig", "/etc/kubernetes/bootstrap.conf"},
		{"--config=relative.yaml"},
	} {
		if _, err := standaloneArgs(args); err == nil {
			t.Fatalf("accepted unsafe kubelet arguments: %v", args)
		}
	}
	args, err := standaloneArgs(
		[]string{"--config=/var/lib/kubelet/config.yaml", "--node-ip=192.0.2.1", "--kubeconfig="},
	)
	if err != nil {
		t.Fatal(err)
	}
	if flagValue(args, "register-node") != "false" || flagValue(args, "node-ip") != "192.0.2.1" {
		t.Fatalf("standalone arguments lost configuration: %v", args)
	}
	repeated, err := standaloneArgs(args)
	if err != nil || strings.Join(repeated, "\x00") != strings.Join(args, "\x00") {
		t.Fatalf("retry changed standalone arguments: %v, %v", repeated, err)
	}
}

func TestNodeConfigPreservesPublicFields(t *testing.T) {
	source := []byte(`apiVersion: kubeadm.k8s.io/v1beta4
kind: ClusterConfiguration
kubernetesVersion: v1.35.1
networking:
  serviceSubnet: 10.96.0.0/12
apiServer:
  extraArgs:
  - name: audit-policy-file
    value: /etc/kubernetes/audit.yaml
futureField:
  preserve: true
---
apiVersion: kubeadm.k8s.io/v1beta4
kind: InitConfiguration
patches:
  directory: /etc/kubernetes/patches
`)
	api := &v1.Pod{
		Spec: v1.PodSpec{
			Containers: []v1.Container{
				{
					Command: []string{
						"kube-apiserver",
						"--advertise-address=2001:db8::1",
						"--secure-port=7443",
					},
				},
			},
		},
	}
	data, err := nodeConfig(
		source,
		"v1.36.0",
		"control-plane",
		"unix:///run/containerd/containerd.sock",
		api,
	)
	if err != nil {
		t.Fatal(err)
	}
	decoder := utilyaml.NewYAMLOrJSONDecoder(bytes.NewReader(data), 4096)
	var cluster, init map[string]any
	if err := decoder.Decode(&cluster); err != nil {
		t.Fatal(err)
	}
	if err := decoder.Decode(&init); err != nil {
		t.Fatal(err)
	}
	if cluster["kubernetesVersion"] != "v1.36.0" ||
		testMap(t, cluster["futureField"])["preserve"] != true {
		t.Fatalf("cluster configuration was lost: %v", cluster)
	}
	endpoint := testMap(t, init["localAPIEndpoint"])
	if endpoint["advertiseAddress"] != "2001:db8::1" || endpoint["bindPort"] != float64(7443) {
		t.Fatalf("wrong local endpoint: %v", endpoint)
	}
	if _, exists := testMap(t, init["nodeRegistration"])["kubeletExtraArgs"]; exists {
		t.Fatal("manifest generation must not supply kubelet bootstrap arguments")
	}
	if testMap(t, init["patches"])["directory"] != "/etc/kubernetes/patches" {
		t.Fatal("InitConfiguration patches were lost")
	}
	if _, err := nodeConfig(
		append(append([]byte{}, source...), append([]byte("\n---\n"), source...)...),
		"v1.36.0",
		"control-plane",
		"unix:///runtime.sock",
		api,
	); err == nil {
		t.Fatal("accepted duplicate ClusterConfiguration documents")
	}
}

func testMap(t *testing.T, value any) map[string]any {
	t.Helper()
	result, ok := value.(map[string]any)
	if !ok {
		t.Fatalf("expected an object, got %T", value)
	}
	return result
}

func TestServiceOverridePreservesLiteralArguments(t *testing.T) {
	got := serviceOverride(
		[]string{"--config=/var/lib/kubelet/config.yaml", `--hostname-override=$HOME%H"x`},
	)
	if !strings.Contains(got, `"--hostname-override=$$HOME%%H\"x"`) {
		t.Fatalf("systemd could expand an argument: %s", got)
	}
	if !strings.HasPrefix(got, "[Service]\nExecStart=\nExecStart=\"/usr/bin/kubelet\"") {
		t.Fatalf("missing explicit standalone process command: %s", got)
	}
}

func TestMountedHostPathUsesTheActualDataVolume(t *testing.T) {
	pod := &v1.Pod{
		Spec: v1.PodSpec{
			Containers: []v1.Container{
				{
					VolumeMounts: []v1.VolumeMount{
						{
							Name:      "data",
							MountPath: "/container/etcd",
						},
						{
							Name:      "wal",
							MountPath: "/container/etcd/wal",
						},
					},
				},
			},
			Volumes: []v1.Volume{
				{
					Name: "data",
					VolumeSource: v1.VolumeSource{
						HostPath: &v1.HostPathVolumeSource{
							Path: "/storage/etcd",
						},
					},
				},
				{
					Name: "wal",
					VolumeSource: v1.VolumeSource{
						HostPath: &v1.HostPathVolumeSource{
							Path: "/storage/wal",
						},
					},
				},
			},
		},
	}
	tests := []struct {
		path string
		want string
	}{
		{"/container/etcd", "/storage/etcd"},
		{"/container/etcd/member", "/storage/etcd/member"},
		{"/container/etcd/wal", "/storage/wal"},
		{"/container/etcd-other", ""},
		{"/container/etcd/../other", ""},
		{"relative", ""},
	}
	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			got, err := mountedHostPath(pod, tt.path)
			if tt.want == "" {
				if err == nil {
					t.Fatalf("accepted an unmapped data directory: %s", got)
				}
				return
			}
			if err != nil || got != tt.want {
				t.Fatalf("got %s, %v; want %s", got, err, tt.want)
			}
		})
	}
	pod.Spec.Containers[0].VolumeMounts[0].SubPath = "member"
	if _, err := mountedHostPath(pod, "/container/etcd"); err == nil {
		t.Fatal("accepted unsupported subPath mapping")
	}
}

func TestLocalKubeletValidationDoesNotChangeWorkerConfig(t *testing.T) {
	config := []byte(`apiVersion: kubeadm.k8s.io/v1beta4
kind: ClusterConfiguration
---
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
rotateCertificates: true
---
apiVersion: kubeproxy.config.k8s.io/v1alpha1
kind: KubeProxyConfiguration
conntrack:
  maxPerCore: 0
`)
	local := []byte(`apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
rotateCertificates: false
`)
	validation, err := withLocalKubeletConfig(config, local)
	if err != nil {
		t.Fatal(err)
	}
	if bytes.Count(validation, []byte("kind: KubeletConfiguration")) != 1 {
		t.Fatal("validation contains duplicate kubelet configurations")
	}
	if !bytes.Contains(validation, []byte("rotateCertificates: false")) ||
		!bytes.Contains(validation, []byte("maxPerCore: 0")) {
		t.Fatal("validation lost the local kubelet or preserved proxy configuration")
	}
	if !bytes.Contains(config, []byte("rotateCertificates: true")) {
		t.Fatal("local validation changed the worker configuration")
	}
}

func TestCopyAtomicPreservesDestinationOnFailure(t *testing.T) {
	dir := t.TempDir()
	destination := filepath.Join(dir, "manifest.yaml")
	if err := os.WriteFile(destination, []byte("old"), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := copyAtomic(filepath.Join(dir, "missing"), destination, 0o600); err == nil {
		t.Fatal("expected a missing source error")
	}
	data, err := os.ReadFile(destination)
	if err != nil || string(data) != "old" {
		t.Fatalf("existing manifest was damaged: %q, %v", data, err)
	}
	source := filepath.Join(dir, "new.yaml")
	if err := os.WriteFile(source, []byte("new"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := copyAtomic(source, destination, 0o600); err != nil {
		t.Fatal(err)
	}
	info, err := os.Stat(destination)
	if err != nil || info.Mode().Perm() != 0o600 {
		t.Fatalf("wrong manifest permissions: %v", err)
	}
	leftovers, err := filepath.Glob(filepath.Join(dir, ".sealos-upgrade-*"))
	if err != nil || len(leftovers) != 0 {
		t.Fatalf("temporary files were left behind: %v, %v", leftovers, err)
	}
}

// This test runs only inside an explicitly prepared disposable Linux host.
func TestRunE2E(t *testing.T) {
	if os.Getenv("SEALOS_STANDALONE_UPGRADE_E2E") != "1" {
		t.Skip("requires an isolated standalone control-plane host")
	}
	err := Run(context.Background(), Options{
		Config:    os.Getenv("SEALOS_STANDALONE_CONFIG"),
		Version:   os.Getenv("SEALOS_STANDALONE_VERSION"),
		BinaryDir: os.Getenv("SEALOS_STANDALONE_BINARIES"),
		CheckOnly: os.Getenv("SEALOS_STANDALONE_CHECK_ONLY") == "1",
		Timeout:   5 * time.Minute,
		Output:    io.Writer(os.Stdout),
	})
	if err != nil {
		t.Fatal(err)
	}
}
