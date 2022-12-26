/*
Copyright 2022 cuisongliu@qq.com.

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

package checker

import (
	"fmt"
	"os"

	"github.com/labring/sealos/pkg/template"

	"github.com/pkg/errors"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/initsystem"
	"github.com/labring/sealos/pkg/utils/logger"
)

type InitSystemChecker struct {
}

type systemStatus struct {
	Name   string
	Status string
}

type InitSystemStatus struct {
	Error       string
	ServiceList []systemStatus
}

func (n *InitSystemChecker) Check(cluster *v2.Cluster, phase string) error {
	if phase != PhasePost {
		return nil
	}
	status := &InitSystemStatus{}

	defer func() {
		err := n.Output(status)
		if err != nil {
			logger.Error("error output: %+v", err)
		}
	}()
	initsystemvar, err := initsystem.GetInitSystem()
	if err != nil {
		status.Error = errors.Wrap(err, "get initsystem error").Error()
		return nil
	}

	serviceNames := []string{"kubelet", "containerd", "cri-docker", "docker", "registry", "image-cri-shim"}
	status.ServiceList = make([]systemStatus, 0)
	for _, sn := range serviceNames {
		status.ServiceList = append(status.ServiceList, systemStatus{
			Name:   sn,
			Status: n.checkInitSystem(initsystemvar, sn),
		})
	}

	status.Error = Nil
	return nil
}

func (n *InitSystemChecker) Output(status *InitSystemStatus) error {
	tpl, isOk, err := template.TryParse(`
Systemd Service Status
  Logger: journalctl -xeu SERVICE-NAME
  Error: {{ .Error }}
  {{ if .ServiceList -}}
  Init System List:
    {{- range  .ServiceList }} 
    Name: {{.Name}} Status: {{.Status}} 
    {{- end }}
  {{ end }}`)
	if err != nil || !isOk {
		if err != nil {
			logger.Error("failed to render system service checkers template. error: %s", err.Error())
			return err
		}
		return errors.New("convert system service template failed")
	}
	if err = tpl.Execute(os.Stdout, status); err != nil {
		return err
	}
	return nil
}

func NewInitSystemChecker() Interface {
	return &InitSystemChecker{}
}

func (n *InitSystemChecker) checkInitSystem(system initsystem.InitSystem, name string) (status string) {
	if !system.ServiceExists(name) {
		status = "NotExists"
	} else {
		var enable, subStatus string
		if !system.ServiceIsEnabled(name) {
			enable = "Disable"
		} else {
			enable = "Enable"
		}
		if !system.ServiceIsActive(name) {
			subStatus = "NotActive"
		} else {
			subStatus = "Active"
		}
		status = fmt.Sprintf("%s && %s", enable, subStatus)
	}

	return
}
