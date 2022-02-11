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
	"path/filepath"
	goruntime "runtime"
	"strings"

	strings2 "github.com/fanux/sealos/pkg/utils/strings"

	"github.com/pkg/errors"

	errorsutil "k8s.io/apimachinery/pkg/util/errors"
	utilsexec "k8s.io/utils/exec"
)

const (
	DefaultDockerCRISocket     = "/var/run/dockershim.sock"
	DefaultContainerdCRISocket = containerdSocket
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
	ImageExists(image string) (bool, error)
	CGroupDriver() (string, error)
}

// ContainerdRuntime is a struct that interfaces with the CRI
type ContainerdRuntime struct {
	exec      utilsexec.Interface
	criSocket string
}

// DockerRuntime is a struct that interfaces with the Docker daemon
type DockerRuntime struct {
	exec utilsexec.Interface
}

// NewContainerRuntime sets up and returns a ContainerRuntime struct
func NewContainerRuntime(execer utilsexec.Interface, criSocket string) (ContainerRuntime, error) {
	var toolName string
	var runtime ContainerRuntime

	if criSocket != DefaultDockerCRISocket {
		toolName = "crictl"
		// !!! temporary work around crictl warning:
		// Using "/var/run/crio/crio.sock" as endpoint is deprecated,
		// please consider using full url format "unix:///var/run/crio/crio.sock"
		if filepath.IsAbs(criSocket) && goruntime.GOOS != "windows" {
			criSocket = "unix://" + criSocket
		}
		runtime = &ContainerdRuntime{execer, criSocket}
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
	if out, err := runtime.exec.Command("crictl", "-r", runtime.criSocket, "info").CombinedOutput(); err != nil {
		return errors.Wrapf(err, "container runtime is not running: output: %s, error", string(out))
	}
	return nil
}

// IsRunning checks if runtime is running
func (runtime *DockerRuntime) IsRunning() error {
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
	if out, err = runtime.exec.Command("docker", "info", "--format", "{{.CgroupDriver}}").CombinedOutput(); err != nil {
		return "", errors.Wrapf(err, "container runtime is not running: output: %s, error", string(out))
	}
	return string(out), nil
}

func (runtime *ContainerdRuntime) CGroupDriver() (string, error) {
	if err := runtime.IsRunning(); err != nil {
		return "", err
	}
	var err error
	var out []byte
	if out, err = runtime.exec.Command("crictl", "-r", runtime.criSocket, "info", "-o", "go-template", "--template", "{{.config.systemdCgroup}}").CombinedOutput(); err != nil {
		return "", errors.Wrapf(err, "container runtime is not running: output: %s, error", string(out))
	}
	if strings2.TrimWS(string(out)) == "false" {
		return DefaultCgroupDriver, nil
	}
	return DefaultSystemdCgroupDriver, nil
}

// ListKubeContainers lists running k8s CRI pods
func (runtime *ContainerdRuntime) ListKubeContainers() ([]string, error) {
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
		out, err := runtime.exec.Command("crictl", "-r", runtime.criSocket, "stopp", container).CombinedOutput()
		if err != nil {
			// don't stop on errors, try to remove as many containers as possible
			errs = append(errs, errors.Wrapf(err, "failed to stop running pod %s: output: %s, error", container, string(out)))
		} else {
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
		out, err := runtime.exec.Command("docker", "stop", container).CombinedOutput()
		if err != nil {
			// don't stop on errors, try to remove as many containers as possible
			errs = append(errs, errors.Wrapf(err, "failed to stop running container %s: output: %s, error", container, string(out)))
		} else {
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
func (runtime *ContainerdRuntime) ImageExists(image string) (bool, error) {
	err := runtime.exec.Command("crictl", "-r", runtime.criSocket, "inspecti", image).Run()
	return err == nil, nil
}

// ImageExists checks to see if the image exists on the system
func (runtime *DockerRuntime) ImageExists(image string) (bool, error) {
	err := runtime.exec.Command("docker", "inspect", image).Run()
	return err == nil, nil
}

// detectCRISocketImpl is separated out only for test purposes, DON'T call it directly, use DetectCRISocket instead
func detectCRISocketImpl(isSocket func(string) bool) (string, error) {
	foundCRISockets := []string{}
	knownCRISockets := []string{
		// Docker and containerd sockets are special cased below, hence not to be included here
		"/var/run/crio/crio.sock",
	}

	if isSocket(dockerSocket) {
		// the path in dockerSocket is not CRI compatible, hence we should replace it with a CRI compatible socket
		foundCRISockets = append(foundCRISockets, DefaultDockerCRISocket)
	} else if isSocket(containerdSocket) {
		// Docker 18.09 gets bundled together with containerd, thus having both dockerSocket and containerdSocket present.
		// For compatibility reasons, we use the containerd socket only if Docker is not detected.
		foundCRISockets = append(foundCRISockets, containerdSocket)
	}

	for _, socket := range knownCRISockets {
		if isSocket(socket) {
			foundCRISockets = append(foundCRISockets, socket)
		}
	}

	switch len(foundCRISockets) {
	case 0:
		// Fall back to Docker if no CRI is detected, we can error out later on if we need it
		return DefaultDockerCRISocket, nil
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
	return detectCRISocketImpl(isExistingSocket)
}
