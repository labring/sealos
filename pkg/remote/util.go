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

package remote

// nosemgrep: go.lang.security.audit.xss.import-text-template.import-text-template
import (
	"bytes"
	"fmt"
	"text/template"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/ssh"
	"github.com/labring/sealos/pkg/utils/logger"
)

func renderTemplate(tmpl *template.Template, data map[string]interface{}) (string, error) {
	var out bytes.Buffer
	err := tmpl.Execute(&out, data)
	if err != nil {
		return "", err
	}
	return out.String(), nil
}

func bashToString(clusterName string, sshInterface ssh.Interface, host, cmd string) (string, error) {
	data := constants.NewData(clusterName)
	cmd = fmt.Sprintf("%s %s", data.RootFSSealctlPath(), cmd)
	logger.Debug("start to exec remote %s shell: %s", host, cmd)
	return sshInterface.CmdToString(host, cmd, "")
}
func bashCTLSync(clusterName string, sshInterface ssh.Interface, host, cmd string) error {
	data := constants.NewData(clusterName)
	cmd = fmt.Sprintf("%s  %s", data.RootFSSealctlPath(), cmd)
	logger.Debug("start to exec remote %s shell: %s", host, cmd)
	return sshInterface.CmdAsync(host, cmd)
}
