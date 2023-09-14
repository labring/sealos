/*
Copyright 2023 cuisongliu@qq.com.

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

package config

import (
	"bytes"
	"fmt"
	"os"
	"path"

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/labring/sealos/test/e2e/testhelper/template"
	"github.com/labring/sealos/test/e2e/testhelper/utils"

	"github.com/pkg/errors"
)

const (
	//	ImageDockerfile = `FROM scratch
	//COPY . .`
	PatchfsTemplateDockerfile = `FROM scratch
MAINTAINER labring
LABEL sealos.io.type="patch"
{{- if .Copys }}
{{- range .Copys }}
COPY {{.}}
{{- end }}
{{- end }}
{{- if .Cmds }}
CMD [{{- range $index, $cmd := .Cmds }}{{if $index}}, {{end}}"{{ $cmd }}"{{- end }}]
{{- end }}`
)

type PatchDockerfile struct {
	Images            []string
	dockerfileContent string
	Copys             []string
	Cmds              []string
}

func (d *PatchDockerfile) Write() (string, error) {
	tmpdir, err := utils.MkTmpdir("")
	if err != nil {
		return "", errors.WithMessage(err, "create tmpdir failed")
	}
	if len(d.Images) != 0 {
		if err := os.MkdirAll(path.Join(tmpdir, "images", "shim"), 0755); err != nil {
			return "", errors.WithMessage(err, "create images dir failed")
		}
		for i, image := range d.Images {
			if err := os.WriteFile(path.Join(tmpdir, "images", "shim", fmt.Sprintf("image%d", i)), []byte(image), 0644); err != nil {
				return "", errors.WithMessage(err, "write shim image failed")
			}
		}
		d.Copys = append(d.Copys, "registry registry")
	}

	t, _, err := template.TryParse(PatchfsTemplateDockerfile)
	if err != nil {
		return "", err
	}
	out := bytes.NewBuffer(nil)
	if err = t.Execute(out, d); err != nil {
		return "", err
	}
	d.dockerfileContent = out.String()
	if d.dockerfileContent == "" {
		return "", errors.New("dockerfile content is not set")
	}
	logger.Info("dockerfile content: %s", d.dockerfileContent)
	if err := os.WriteFile(tmpdir+"/Dockerfile", []byte(d.dockerfileContent), 0644); err != nil {
		return "", errors.WithMessage(err, "write RootfsDockerfile failed")
	}
	return tmpdir, nil
}
