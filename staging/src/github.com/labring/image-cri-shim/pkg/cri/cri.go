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
	"os"
	"path/filepath"
	goruntime "runtime"
	"strings"

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/labring/sealos/pkg/utils/file"

	toml "github.com/pelletier/go-toml"
	"github.com/pkg/errors"
	errorsutil "k8s.io/apimachinery/pkg/util/errors"
	utilsexec "k8s.io/utils/exec"
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
	// PullImageRetry specifies how many times ContainerRuntime retries when pulling image failed
	PullImageRetry = 5
)

// ContainerRuntime is an interface for working with container runtimes
type ContainerRuntime interface {
	IsDocker() bool
	IsRunning() error
	ListKubeContainers() ([]string, error)
	RemoveContainers(containers []string) error
	PullImage(image string) error
	ImageExists(image string) bool
	CGroupDriver() (string, error)
}

// ContainerdRuntime is a struct that interfaces with the CRI
type ContainerdRuntime struct {
	exec      utilsexec.Interface
	criSocket string
	config    string
}

// DockerRuntime is a struct that interfaces with the Docker daemon
type DockerRuntime struct {
	exec utilsexec.Interface
}

// NewContainerRuntime sets up and returns a ContainerRuntime struct
func NewContainerRuntime(execer utilsexec.Interface, criSocket string, config string) (ContainerRuntime, error) {
	var toolName string
	var runtime ContainerRuntime

	if criSocket != CRISocketDocker {
		toolName = "crictl"
		// !!! temporary work around crictl warning:
		// Using "/var/run/crio/crio.sock" as endpoint is deprecated,
		// please consider using full url format "unix:///var/run/crio/crio.sock"
		if filepath.IsAbs(criSocket) && goruntime.GOOS != "windows" {
			criSocket = "unix://" + criSocket
		}
		runtime = &ContainerdRuntime{execer, criSocket, config}
	} else {
		toolName = "docker"
		runtime = &DockerRuntime{execer}
	}

	if _, err := execer.LookPath(toolName); err != nil {
		return nil, errors.Wrapf(err, "%s is required for container runtime", toolName)
	}

	return runtime, nil
}

// IsDocker returns true if the runtime is docker
func (runtime *ContainerdRuntime) IsDocker() bool {
	return false
}

// IsDocker returns true if the runtime is docker
func (runtime *DockerRuntime) IsDocker() bool {
	return true
}

// IsRunning checks if runtime is running
func (runtime *ContainerdRuntime) IsRunning() error {
	// nosemgrep: trailofbits.go.invalid-usage-of-modified-variable.invalid-usage-of-modified-variable
	if out, err := runtime.exec.Command("crictl", "-r", runtime.criSocket, "info").CombinedOutput(); err != nil {
		return errors.Wrapf(err, "container runtime is not running: output: %s, error", string(out))
	}
	return nil
}

// IsRunning checks if runtime is running
func (runtime *DockerRuntime) IsRunning() error {
	// nosemgrep: trailofbits.go.invalid-usage-of-modified-variable.invalid-usage-of-modified-variable
	if out, err := runtime.exec.Command("docker", "info").CombinedOutput(); err != nil {
		return errors.Wrapf(err, "container runtime is not running: output: %s, error", string(out))
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
		return "", errors.Wrapf(err, "container runtime is not running: output: %s, error", string(out))
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
	type Config struct {
		Version int    `toml:"version"`
		Root    string `toml:"root"`
		Plugins struct {
			IoContainerdGrpcV1Cri struct {
				SandboxImage            string `toml:"sandbox_image"`
				MaxContainerLogLineSize int    `toml:"max_container_log_line_size"`
				MaxConcurrentDownloads  int    `toml:"max_concurrent_downloads"`
				Containerd              struct {
					Snapshotter        string `toml:"snapshotter"`
					DefaultRuntimeName string `toml:"default_runtime_name"`
					Runtimes           struct {
						Runc struct {
							RuntimeType   string `toml:"runtime_type"`
							RuntimeEngine string `toml:"runtime_engine"`
							RuntimeRoot   string `toml:"runtime_root"`
							Options       struct {
								SystemdCgroup bool `toml:"SystemdCgroup"`
							} `toml:"options"`
						} `toml:"runc"`
					} `toml:"runtimes"`
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
		if config.Plugins.IoContainerdGrpcV1Cri.Containerd.Runtimes.Runc.Options.SystemdCgroup {
			return DefaultSystemdCgroupDriver, nil
		}
	}
	return DefaultCgroupDriver, nil
}

// ListKubeContainers lists running k8s CRI pods
func (runtime *ContainerdRuntime) ListKubeContainers() ([]string, error) {
	// nosemgrep: trailofbits.go.invalid-usage-of-modified-variable.invalid-usage-of-modified-variable
	out, err := runtime.exec.Command("crictl", "-r", runtime.criSocket, "pods", "-q").CombinedOutput()
	if err != nil {
		return nil, errors.Wrapf(err, "output: %s, error", string(out))
	}
	pods := []string{}
	pods = append(pods, strings.Fields(string(out))...)
	return pods, nil
}

// ListKubeContainers lists running k8s containers
func (runtime *DockerRuntime) ListKubeContainers() ([]string, error) {
	output, err := runtime.exec.Command("docker", "ps", "-a", "--filter", "name=k8s_", "-q").CombinedOutput()
	return strings.Fields(string(output)), err
}

// RemoveContainers removes running k8s pods
func (runtime *ContainerdRuntime) RemoveContainers(containers []string) error {
	errs := []error{}
	for _, container := range containers {
		// nosemgrep: trailofbits.go.invalid-usage-of-modified-variable.invalid-usage-of-modified-variable
		out, err := runtime.exec.Command("crictl", "-r", runtime.criSocket, "stopp", container).CombinedOutput()
		if err != nil {
			// don't stop on errors, try to remove as many containers as possible
			errs = append(errs, errors.Wrapf(err, "failed to stop running pod %s: output: %s, error", container, string(out)))
		} else {
			// nosemgrep: trailofbits.go.invalid-usage-of-modified-variable.invalid-usage-of-modified-variable
			out, err = runtime.exec.Command("crictl", "-r", runtime.criSocket, "rmp", container).CombinedOutput()
			if err != nil {
				errs = append(errs, errors.Wrapf(err, "failed to remove running container %s: output: %s, error", container, string(out)))
			}
		}
	}
	return errorsutil.NewAggregate(errs)
}

// RemoveContainers removes running containers
func (runtime *DockerRuntime) RemoveContainers(containers []string) error {
	errs := []error{}
	for _, container := range containers {
		// nosemgrep: trailofbits.go.invalid-usage-of-modified-variable.invalid-usage-of-modified-variable
		out, err := runtime.exec.Command("docker", "stop", container).CombinedOutput()
		if err != nil {
			// don't stop on errors, try to remove as many containers as possible
			errs = append(errs, errors.Wrapf(err, "failed to stop running container %s: output: %s, error", container, string(out)))
		} else {
			// nosemgrep: trailofbits.go.invalid-usage-of-modified-variable.invalid-usage-of-modified-variable
			out, err = runtime.exec.Command("docker", "rm", "--volumes", container).CombinedOutput()
			if err != nil {
				errs = append(errs, errors.Wrapf(err, "failed to remove running container %s: output: %s, error", container, string(out)))
			}
		}
	}
	return errorsutil.NewAggregate(errs)
}

// PullImage pulls the image
func (runtime *ContainerdRuntime) PullImage(image string) error {
	var err error
	var out []byte
	for i := 0; i < PullImageRetry; i++ {
		out, err = runtime.exec.Command("crictl", "-r", runtime.criSocket, "pull", image).CombinedOutput()
		if err == nil {
			return nil
		}
	}
	return errors.Wrapf(err, "output: %s, error", out)
}

// PullImage pulls the image
func (runtime *DockerRuntime) PullImage(image string) error {
	var err error
	var out []byte
	for i := 0; i < PullImageRetry; i++ {
		out, err = runtime.exec.Command("docker", "pull", image).CombinedOutput()
		if err == nil {
			return nil
		}
	}
	return errors.Wrapf(err, "output: %s, error", out)
}

// ImageExists checks to see if the image exists on the system
func (runtime *ContainerdRuntime) ImageExists(image string) bool {
	err := runtime.exec.Command("crictl", "-r", runtime.criSocket, "inspecti", image).Run()
	return err == nil
}

// ImageExists checks to see if the image exists on the system
func (runtime *DockerRuntime) ImageExists(image string) bool {
	err := runtime.exec.Command("docker", "inspect", image).Run()
	return err == nil
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
		return "", errors.Errorf("Found multiple CRI sockets, please use --cri-socket to select one: %s", strings.Join(foundCRISockets, ", "))
	}
}

// DetectCRISocket uses a list of known CRI sockets to detect one. If more than one or none is discovered, an error is returned.
func DetectCRISocket() (string, error) {
	return detectCRISocketImpl(isExistingSocket, defaultKnownCRISockets)
}
