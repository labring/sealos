/*
Copyright 2016 The Kubernetes Authors.

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

package initsystem

import (
	"fmt"
	"os/exec"
	"strings"

	"k8s.io/kubernetes/cmd/kubeadm/app/util/initsystem"
)

type InitSystem interface {
	// ServiceEnable tries to enable a specific service
	ServiceEnable(service string) error
	initsystem.InitSystem
}

type initSystem struct {
	initsystem.InitSystem
}

func (s *initSystem) ServiceEnable(service string) error {
	cmd := s.InitSystem.EnableCommand(service)
	parts := strings.Split(cmd, " ")
	if parts[0] == "systemctl" {
		if err := exec.Command("systemctl", "daemon-reload").Run(); err != nil {
			return fmt.Errorf("failed to reload init system: %v", err)
		}
	}
	args := parts[1:]
	// nosemgrep: go.lang.security.audit.dangerous-exec-command.dangerous-exec-command
	return exec.Command(parts[0], args...).Run()
}

func GetInitSystem() (InitSystem, error) {
	is, err := initsystem.GetInitSystem()
	if err != nil {
		return nil, err
	}
	return &initSystem{is}, nil
}
