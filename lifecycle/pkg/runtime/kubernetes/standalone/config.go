// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

// Package standalone implements node-local control-plane maintenance using
// kubeadm's phase CLI and the published CRI and etcd APIs.
package standalone

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/Masterminds/semver/v3"
	v1 "k8s.io/api/core/v1"
	utilyaml "k8s.io/apimachinery/pkg/util/yaml"
	"sigs.k8s.io/yaml"
)

const manifestDir = "/etc/kubernetes/manifests"

var controlPlaneComponents = []string{
	"kube-apiserver",
	"kube-controller-manager",
	"kube-scheduler",
}

func ValidateVersionChange(current, target string) error {
	a, err := semver.NewVersion(strings.TrimSpace(current))
	if err != nil {
		return err
	}
	b, err := semver.NewVersion(strings.TrimSpace(target))
	if err != nil {
		return err
	}
	if a.Major() != 1 || b.Major() != 1 || a.Minor() < 28 ||
		b.LessThan(a) || b.Minor() > a.Minor()+1 ||
		a.Prerelease() != "" || b.Prerelease() != "" {
		return fmt.Errorf("standalone upgrade requires stable Kubernetes >= 1.28 without downgrade or skipped minor versions: %s -> %s", current, target)
	}
	return nil
}

func flagValue(args []string, name string) string {
	var value string
	for i, arg := range args {
		if strings.HasPrefix(arg, "--"+name+"=") {
			value = strings.TrimPrefix(arg, "--"+name+"=")
		} else if arg == "--"+name && i+1 < len(args) {
			value = args[i+1]
		}
	}
	return value
}

func standaloneArgs(args []string) ([]string, error) {
	for _, flag := range []string{"kubeconfig", "bootstrap-kubeconfig"} {
		if flagValue(args, flag) != "" {
			return nil, fmt.Errorf("kubelet is not standalone: --%s is configured", flag)
		}
	}
	if !filepath.IsAbs(flagValue(args, "config")) {
		return nil, fmt.Errorf("standalone kubelet requires an absolute --config path")
	}
	if flagValue(args, "config-dir") != "" {
		return nil, fmt.Errorf("standalone upgrade does not yet validate kubelet --config-dir overrides")
	}
	var preserved []string
	for i := 0; i < len(args); i++ {
		arg := args[i]
		name := strings.SplitN(arg, "=", 2)[0]
		switch name {
		case "--kubeconfig", "--bootstrap-kubeconfig":
			if arg == name {
				i++
			}
		case "--register-node":
		default:
			preserved = append(preserved, arg)
		}
	}
	return append(preserved, "--kubeconfig=", "--bootstrap-kubeconfig=", "--register-node=false"), nil
}

func readPod(path string) (*v1.Pod, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var pod v1.Pod
	if err := yaml.Unmarshal(data, &pod); err != nil {
		return nil, err
	}
	if pod.Kind != "Pod" || pod.Namespace != "kube-system" || !pod.Spec.HostNetwork || len(pod.Spec.Containers) != 1 {
		return nil, fmt.Errorf("expected a single-container host-network control-plane Pod in %s", path)
	}
	return &pod, nil
}

func componentArgs(pod *v1.Pod) []string {
	c := pod.Spec.Containers[0]
	return append(append([]string{}, c.Command...), c.Args...)
}

func mountedHostPath(pod *v1.Pod, path string) (string, error) {
	if !filepath.IsAbs(path) {
		return "", fmt.Errorf("container data path must be absolute: %s", path)
	}
	path = filepath.Clean(path)
	var selected *v1.VolumeMount
	for i := range pod.Spec.Containers[0].VolumeMounts {
		mount := &pod.Spec.Containers[0].VolumeMounts[i]
		base := filepath.Clean(mount.MountPath)
		relative, err := filepath.Rel(base, path)
		if err != nil || relative == ".." || strings.HasPrefix(relative, ".."+string(filepath.Separator)) {
			continue
		}
		if selected == nil || len(base) > len(filepath.Clean(selected.MountPath)) {
			selected = mount
		}
	}
	if selected == nil || selected.SubPath != "" || selected.SubPathExpr != "" || selected.ReadOnly {
		return "", fmt.Errorf("%s requires a writable hostPath mount without subPath", path)
	}
	for _, volume := range pod.Spec.Volumes {
		if volume.Name != selected.Name {
			continue
		}
		if volume.HostPath == nil || !filepath.IsAbs(volume.HostPath.Path) {
			break
		}
		relative, err := filepath.Rel(selected.MountPath, path)
		if err != nil {
			return "", err
		}
		return filepath.Join(volume.HostPath.Path, relative), nil
	}
	return "", fmt.Errorf("cannot resolve hostPath for %s", path)
}

// Keep the public configuration as data so newer kubeadm fields are not lost
// through conversions by the Kubernetes version linked into sealctl.
func nodeConfig(data []byte, target, name, endpoint string, api *v1.Pod) ([]byte, error) {
	decoder := utilyaml.NewYAMLOrJSONDecoder(bytes.NewReader(data), 4096)
	var cluster map[string]interface{}
	var init map[string]interface{}
	var components []map[string]interface{}
	for {
		var doc map[string]interface{}
		err := decoder.Decode(&doc)
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, err
		}
		if doc["kind"] == "ClusterConfiguration" {
			if cluster != nil {
				return nil, fmt.Errorf("multiple ClusterConfiguration documents")
			}
			cluster = doc
		}
		if doc["kind"] == "InitConfiguration" {
			if init != nil {
				return nil, fmt.Errorf("multiple InitConfiguration documents")
			}
			init = doc
		}
		if doc["kind"] == "KubeProxyConfiguration" || doc["kind"] == "KubeletConfiguration" {
			components = append(components, doc)
		}
	}
	if cluster == nil {
		return nil, fmt.Errorf("ClusterConfiguration is required")
	}
	if dir, ok := cluster["certificatesDir"].(string); ok && dir != "" && dir != "/etc/kubernetes/pki" {
		return nil, fmt.Errorf("standalone upgrade currently requires certificatesDir=/etc/kubernetes/pki")
	}
	cluster["kubernetesVersion"] = target
	args := componentArgs(api)
	address := flagValue(args, "advertise-address")
	port, err := strconv.Atoi(flagValue(args, "secure-port"))
	if err != nil || net.ParseIP(address) == nil || port < 1 || port > 65535 {
		return nil, fmt.Errorf("cannot identify the local API endpoint from its manifest")
	}
	if init == nil {
		init = make(map[string]interface{})
	}
	init["apiVersion"] = cluster["apiVersion"]
	init["kind"] = "InitConfiguration"
	init["localAPIEndpoint"] = map[string]interface{}{
		"advertiseAddress": address,
		"bindPort":         port,
	}
	registration, _ := init["nodeRegistration"].(map[string]interface{})
	if registration == nil {
		registration = make(map[string]interface{})
	}
	registration["name"] = name
	registration["criSocket"] = endpoint
	init["nodeRegistration"] = registration
	c, err := yaml.Marshal(cluster)
	if err != nil {
		return nil, err
	}
	i, err := yaml.Marshal(init)
	if err != nil {
		return nil, err
	}
	result := append(append(c, []byte("\n---\n")...), i...)
	for _, component := range components {
		doc, err := yaml.Marshal(component)
		if err != nil {
			return nil, err
		}
		result = append(append(result, []byte("\n---\n")...), doc...)
	}
	return result, nil
}

func appendComponentConfigs(original []byte, migratedPath string) error {
	decoder := utilyaml.NewYAMLOrJSONDecoder(bytes.NewReader(original), 4096)
	var components []byte
	for {
		var doc map[string]interface{}
		err := decoder.Decode(&doc)
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
		if doc["kind"] != "KubeProxyConfiguration" && doc["kind"] != "KubeletConfiguration" {
			continue
		}
		data, err := yaml.Marshal(doc)
		if err != nil {
			return err
		}
		components = append(append(components, []byte("\n---\n")...), data...)
	}
	file, err := os.OpenFile(migratedPath, os.O_WRONLY|os.O_APPEND, 0)
	if err != nil {
		return err
	}
	defer file.Close()
	_, err = file.Write(components)
	return err
}

func withLocalKubeletConfig(config, kubelet []byte) ([]byte, error) {
	decoder := utilyaml.NewYAMLOrJSONDecoder(bytes.NewReader(config), 4096)
	var result []byte
	for {
		var doc map[string]interface{}
		err := decoder.Decode(&doc)
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, err
		}
		if doc == nil || doc["kind"] == "KubeletConfiguration" {
			continue
		}
		data, err := yaml.Marshal(doc)
		if err != nil {
			return nil, err
		}
		result = append(result, data...)
		result = append(result, []byte("\n---\n")...)
	}
	return append(result, kubelet...), nil
}

func writeJSON(path string, value interface{}) error {
	data, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o600)
}

func serviceOverride(args []string) string {
	var quoted []string
	for _, arg := range append([]string{"/usr/bin/kubelet"}, args...) {
		arg = strings.NewReplacer(
			"\\", "\\\\",
			"\"", "\\\"",
			"%", "%%",
			"$", "$$",
			"\n", "\\n",
			"\r", "\\r",
		).Replace(arg)
		quoted = append(quoted, "\""+arg+"\"")
	}
	return "[Service]\nExecStart=\nExecStart=" + strings.Join(quoted, " ") + "\n"
}
