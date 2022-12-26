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
	"github.com/labring/sealos/pkg/utils/iputils"

	"github.com/pkg/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/labring/sealos/pkg/bootstrap"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/ssh"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	fileutil "github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/registry"
	"github.com/labring/sealos/pkg/utils/yaml"
)

type RegistryChecker struct {
}

type RegistryStatus struct {
	Port           string
	DebugPort      string
	Storage        string
	Delete         bool
	Htpasswd       string
	RegistryDomain string
	Auth           string
	Ping           string
	Error          string
}

func (n *RegistryChecker) Check(cluster *v2.Cluster, phase string) error {
	if phase != PhasePost {
		return nil
	}
	localAddr, _ := iputils.ListLocalHostAddrs()
	if !iputils.IsLocalIP(cluster.GetRegistryIP(), localAddr) {
		logger.Info("current registry ip is %s,not local addr,skip check.", cluster.GetRegistryIP())
		return nil
	}
	status := &RegistryStatus{}
	defer func() {
		err := n.Output(status)
		if err != nil {
			logger.Error("error output: %+v", err)
		}
	}()

	registryConfig := "/etc/registry/registry_config.yml"
	if cfg, err := fileutil.ReadAll(registryConfig); err != nil {
		status.Error = errors.Wrap(err, "read registry config error").Error()
	} else {
		cfgMap, _ := yaml.UnmarshalData(cfg)
		status.Port, _, _ = unstructured.NestedString(cfgMap, "http", "addr")
		status.Storage, _, _ = unstructured.NestedString(cfgMap, "storage", "filesystem", "rootdirectory")
		status.Delete, _, _ = unstructured.NestedBool(cfgMap, "storage", "delete", "enabled")
		status.DebugPort, _, _ = unstructured.NestedString(cfgMap, "http", "debug", "addr")
		authPath, _, _ := unstructured.NestedString(cfgMap, "auth", "htpasswd", "path")
		if authPath != "" {
			htpasswd, _ := fileutil.ReadAll(authPath)
			status.Htpasswd = string(htpasswd)
		}
	}

	sshCtx, err := ssh.NewSSHByCluster(cluster, false)
	if err != nil {
		status.Error = errors.Wrap(err, "get ssh interface error").Error()
		return nil
	}
	root := constants.NewData(cluster.Name).RootFSPath()
	regInfo := bootstrap.GetRegistryInfo(sshCtx, root, cluster.GetRegistryIPAndPort())
	status.Auth = fmt.Sprintf("%s:%s", regInfo.Username, regInfo.Password)
	status.RegistryDomain = fmt.Sprintf("%s:%s", regInfo.Domain, regInfo.Port)
	regInterface, err := registry.NewRegistryForDomain(status.RegistryDomain, regInfo.Username, regInfo.Password)
	if err != nil {
		status.Error = errors.Wrap(err, "get registry interface error").Error()
		return nil
	}
	if err = regInterface.Ping(); err != nil {
		status.Ping = fmt.Sprintf("error: %+v", err)
	} else {
		status.Ping = "ok"
	}
	status.Error = Nil
	return nil
}

func (n *RegistryChecker) Output(status *RegistryStatus) error {
	tpl, isOk, err := template.TryParse(`Registry Service Status
  Port: {{ .Port }}
  DebugPort: {{ .DebugPort }}
  Storage: {{ .Storage }}
  Delete: {{ .Delete }}
  RegistryDomain: {{ .RegistryDomain }}
  Htpasswd: {{ .Htpasswd }}
  Auth: {{ .Auth }}
  Ping: {{ .Ping }}
  Error: {{ .Error }}
  Logger: journalctl -xeu registry
`)
	if err != nil || !isOk {
		if err != nil {
			logger.Error("failed to render registry checkers template. error: %s", err.Error())
			return err
		}
		return errors.New("convert registry template failed")
	}
	if err = tpl.Execute(os.Stdout, status); err != nil {
		return err
	}
	return nil
}

func NewRegistryChecker() Interface {
	return &RegistryChecker{}
}
