/*
Copyright 2023 sealos.

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

package utils

import (
	"fmt"

	"gopkg.in/yaml.v2"

	"github.com/labring/sealos/pkg/constants"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/exec"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/version"
)

func GetKubernetesVersion(cluster *v2.Cluster) *version.KubernetesVersion {
	var cmd string
	if cluster == nil {
		cmd = "kubectl version -o yaml"
	} else {
		cmd = fmt.Sprintf("kubectl version --kubeconfig %s -o yaml",
			constants.NewPathResolver(cluster.Name).AdminFile())
	}
	serverVersion, err := exec.RunBashCmd(cmd)
	if err != nil || serverVersion == "" {
		logger.Debug(err, "get kubernetes version failed")
		return nil
	}
	var Unmarshaled version.KubernetesVersion
	if err = yaml.Unmarshal([]byte(serverVersion), &Unmarshaled); err != nil {
		logger.Debug(err, "unmarshal kubernetes version failed")
		return nil
	}
	return &Unmarshaled
}

func GetCriRuntimeVersion() *version.CriRuntimeVersion {
	cmd := "crictl version"
	criRuntimeVersion, err := exec.RunBashCmd(cmd)
	if err != nil || criRuntimeVersion == "" {
		logger.Debug(err, "get cri runtime version failed")
		return nil
	}
	var Unmarshaled version.CriRuntimeVersion
	if err = yaml.Unmarshal([]byte(criRuntimeVersion), &Unmarshaled); err != nil {
		logger.Debug(err, "unmarshal cri runtime version failed")
		return nil
	}
	return &Unmarshaled
}
