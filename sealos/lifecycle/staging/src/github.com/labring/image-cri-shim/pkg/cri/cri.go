/*
Copyright 2018 The Kubernetes Authors.

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

package cri

import (
	"fmt"
	"os"
	"path/filepath"
	goruntime "runtime"
	"strings"

	toml "github.com/pelletier/go-toml"
	utilsexec "k8s.io/utils/exec"

	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
)

// defaultKnownCRISockets holds the set of known CRI endpoints
var defaultKnownCRISockets = []string{
	CRISocketDocker,
	CRISocketContainerd,
	CRISocketCRIO,
}

const (
	DefaultCgroupDriver        = "cgroupfs"
	DefaultSystemdCgroupDriver = "systemd"
)

// ContainerRuntime is an interface for working with container runtimes
type ContainerRuntime interface {
	IsRunning() error
	CGroupDriver() (string, error)
}

// ContainerdRuntime is a struct that interfaces with the CRI
type ContainerdRuntime struct {
	exec      utilsexec.Interface
	criSocket string
	config    string
}

// CRIORuntime is a struct that interfaces with the CRI
//
//nolint:all
type CRIORuntime struct {
	ContainerdRuntime
}

func (runtime *CRIORuntime) CGroupDriver() (string, error) {
	if err := runtime.IsRunning(); err != nil {
		return "", err
	}
	var outBytes []byte
	var err error
	driverCmd := fmt.Sprintf("crio-status -s %s  info | grep \"cgroup driver\" | awk '{print $3}'", runtime.criSocket)
	// nosemgrep: trailofbits.go.invalid-usage-of-modified-variable.invalid-usage-of-modified-variable
	if outBytes, err = runtime.exec.Command("bash", "-c", driverCmd).CombinedOutput(); err != nil {
		return DefaultCgroupDriver, fmt.Errorf("container cgroup driver: output: %s, error: %w", string(outBytes), err)
	}
	return strings.TrimSpace(string(outBytes)), nil
}

// DockerRuntime is a struct that interfaces with the Docker daemon
type DockerRuntime struct {
	exec utilsexec.Interface
}

// NewContainerRuntime sets up and returns a ContainerRuntime struct
func NewContainerRuntime(execer utilsexec.Interface, criSocket string, config string) (ContainerRuntime, error) {
	var toolNames string
	var runtime ContainerRuntime

	if criSocket != CRISocketDocker {
		toolNames = "crictl"
		if criSocket == CRISocketCRIO {
			toolNames = "crictl,crio-status"
			runtime = &CRIORuntime{
				ContainerdRuntime{execer, criSocket, config},
			}
		} else {
			// !!! temporary work around crictl warning:
			// Using "/var/run/crio/crio.sock" as endpoint is deprecated,
			// please consider using full url format "unix:///var/run/crio/crio.sock"
			if filepath.IsAbs(criSocket) && goruntime.GOOS != "windows" {
				criSocket = "unix://" + criSocket
			}
			runtime = &ContainerdRuntime{
				execer, criSocket, config,
			}
		}
	} else {
		toolNames = "docker"
		runtime = &DockerRuntime{execer}
	}
	for _, toolName := range strings.Split(toolNames, ",") {
		if _, err := execer.LookPath(toolName); err != nil {
			return nil, fmt.Errorf("%s is required for container runtime: %w", toolName, err)
		}
	}
	return runtime, nil
}

// IsRunning checks if runtime is running
func (runtime *ContainerdRuntime) IsRunning() error {
	// nosemgrep: trailofbits.go.invalid-usage-of-modified-variable.invalid-usage-of-modified-variable
	if out, err := runtime.exec.Command("crictl", "-r", runtime.criSocket, "info").CombinedOutput(); err != nil {
		return fmt.Errorf("container runtime is not running: output: %s, error: %w", string(out), err)
	}
	return nil
}

// IsRunning checks if runtime is running
func (runtime *DockerRuntime) IsRunning() error {
	// nosemgrep: trailofbits.go.invalid-usage-of-modified-variable.invalid-usage-of-modified-variable
	if out, err := runtime.exec.Command("docker", "info").CombinedOutput(); err != nil {
		return fmt.Errorf("container runtime is not running: output: %s, error: %w", string(out), err)
	}
	return nil
}

func (runtime *DockerRuntime) CGroupDriver() (string, error) {
	if err := runtime.IsRunning(); err != nil {
		return "", err
	}
	var err error
	var out []byte
	// nosemgrep: trailofbits.go.invalid-usage-of-modified-variable.invalid-usage-of-modified-variable
	if out, err = runtime.exec.Command("docker", "info", "--format", "{{.CgroupDriver}}").CombinedOutput(); err != nil {
		return "", fmt.Errorf("container runtime is not running: output: %s, error: %w", string(out), err)
	}
	return string(out), nil
}

func (runtime *ContainerdRuntime) CGroupDriver() (string, error) {
	if err := runtime.IsRunning(); err != nil {
		return "", err
	}
	runtime.configFile()
	return runtime.processConfigFile()
}

func (runtime *ContainerdRuntime) configFile() {
	const defaultConfig = "/etc/containerd/config.toml"
	if !file.IsExist(runtime.config) {
		runtime.config = defaultConfig
	}
}

func (runtime *ContainerdRuntime) processConfigFile() (string, error) {
	// Config is a wrapper of server config for printing out.
	type Runtime struct {
		RuntimeType   string `toml:"runtime_type"`
		RuntimeEngine string `toml:"runtime_engine"`
		RuntimeRoot   string `toml:"runtime_root"`
		Options       struct {
			SystemdCgroup bool   `toml:"SystemdCgroup"`
			BinaryName    string `toml:"BinaryName"`
		} `toml:"options"`
	}
	type Config struct {
		Version int    `toml:"version"`
		Root    string `toml:"root"`
		Plugins struct {
			IoContainerdGrpcV1Cri struct {
				SandboxImage            string `toml:"sandbox_image"`
				MaxContainerLogLineSize int    `toml:"max_container_log_line_size"`
				MaxConcurrentDownloads  int    `toml:"max_concurrent_downloads"`
				Containerd              struct {
					Snapshotter        string             `toml:"snapshotter"`
					DefaultRuntimeName string             `toml:"default_runtime_name"`
					Runtimes           map[string]Runtime `toml:"runtimes"`
				} `toml:"containerd"`
			} `toml:"io.containerd.grpc.v1.cri"`
		} `toml:"plugins"`
	}
	config := &Config{}
	if file.IsExist(runtime.config) {
		data, err := os.ReadFile(runtime.config)
		if err != nil {
			return "", err
		}
		err = toml.Unmarshal(data, config)
		if err != nil {
			return "", err
		}
		defaultRuntime := config.Plugins.IoContainerdGrpcV1Cri.Containerd.DefaultRuntimeName
		containerRuntime, ok := config.Plugins.IoContainerdGrpcV1Cri.Containerd.Runtimes[defaultRuntime]
		if ok {
			if containerRuntime.Options.SystemdCgroup {
				return DefaultSystemdCgroupDriver, nil
			}
		}
	}
	return DefaultCgroupDriver, nil
}

// detectCRISocketImpl is separated out only for test purposes, DON'T call it directly, use DetectCRISocket instead
func detectCRISocketImpl(isSocket func(string) bool, knownCRISockets []string) (string, error) {
	foundCRISockets := []string{}

	for _, socket := range knownCRISockets {
		if isSocket(socket) {
			foundCRISockets = append(foundCRISockets, socket)
		}
	}
	logger.Debug("knownCRISockets: %+v,foundCRISockets: %+v", knownCRISockets, foundCRISockets)
	switch len(foundCRISockets) {
	case 0:
		// Fall back to the default socket if no CRI is detected, we can error out later on if we need it
		return DefaultCRISocket, nil
	case 1:
		// Precisely one CRI found, use that
		return foundCRISockets[0], nil
	default:
		// Multiple CRIs installed?
		return "", fmt.Errorf("found multiple CRI sockets, please use --cri-socket to select one: %s", strings.Join(foundCRISockets, ", "))
	}
}

// DetectCRISocket uses a list of known CRI sockets to detect one. If more than one or none is discovered, an error is returned.
func DetectCRISocket() (string, error) {
	return detectCRISocketImpl(isExistingSocket, defaultKnownCRISockets)
}
