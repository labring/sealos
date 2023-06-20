/*
Copyright 2014 The Kubernetes Authors.

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

package version

import (
	"fmt"
	"runtime"

	"github.com/labring/sealos/pkg/utils/logger"

	"gopkg.in/yaml.v2"

	"github.com/labring/sealos/pkg/utils/exec"

	"github.com/labring/sealos/pkg/constants"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

// Get returns the overall codebase version. It's for detecting
// what code a binary was built from.
func Get() Info {
	// These variables typically come from -ldflags settings and in
	// their absence fallback to the settings in ./base.go
	return Info{
		GitVersion: gitVersion,
		GitCommit:  gitCommit,
		BuildDate:  buildDate,
		GoVersion:  runtime.Version(),
		Compiler:   runtime.Compiler,
		Platform:   fmt.Sprintf("%s/%s", runtime.GOOS, runtime.GOARCH),
	}
}

func GetKubernetesVersion(cluster *v2.Cluster) *KubernetesVersion {
	var cmd string
	if cluster == nil {
		cmd = "kubectl version -o yaml"
	} else {
		data := constants.NewData(cluster.Name)
		cmd = fmt.Sprintf("kubectl version --kubeconfig %s -o yaml", data.AdminFile())
	}
	serverVersion, err := exec.RunBashCmd(cmd)
	if err != nil || serverVersion == "" {
		logger.Debug(err, "get kubernetes version failed")
		return nil
	}
	var Unmarshaled KubernetesVersion
	if err = yaml.Unmarshal([]byte(serverVersion), &Unmarshaled); err != nil {
		logger.Debug(err, "unmarshal kubernetes version failed")
		return nil
	}
	return &Unmarshaled
}

func GetCriRuntimeVersion() *CriRuntimeVersion {
	cmd := "crictl version"
	criRuntimeVersion, err := exec.RunBashCmd(cmd)
	if err != nil || criRuntimeVersion == "" {
		logger.Debug(err, "get cri runtime version failed")
		return nil
	}
	var Unmarshaled CriRuntimeVersion
	if err = yaml.Unmarshal([]byte(criRuntimeVersion), &Unmarshaled); err != nil {
		logger.Debug(err, "unmarshal cri runtime version failed")
		return nil
	}
	return &Unmarshaled
}
