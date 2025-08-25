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

package image

// nosemgrep: go.lang.security.audit.xss.import-text-template.import-text-template
import (
	"bytes"
	"strings"
	"text/template"

	v1 "github.com/opencontainers/image-spec/specs-go/v1"

	"github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/maps"
)

func escapeDollarSign(s string, cmd bool) string {
	if cmd {
		return strings.ReplaceAll(s, "$", "\\$")
	}
	var buffer bytes.Buffer
	for i := 0; i < len(s); i++ {
		if s[i] == '$' {
			if i+1 < len(s) && s[i+1] == '(' {
				buffer.WriteByte(s[i])
			} else {
				buffer.WriteString("\\$")
			}
		} else {
			buffer.WriteByte(s[i])
		}
	}
	return buffer.String()
}

func MergeDockerfileFromImages(imageObjList []map[string]v1.Image) (string, error) {
	var labels map[string]string
	var envs map[string]string
	var cmds []string
	var entrypoints []string
	var isRootfs bool
	imageNames := make([]string, 0)
	for _, oci := range imageObjList {
		for name, val := range oci {
			imageNames = append(imageNames, name)
			labels = maps.Merge(labels, val.Config.Labels)

			if val.Config.Labels != nil {
				if key := maps.GetFromKeys(val.Config.Labels, v1beta1.ImageTypeKeys...); key == string(v1beta1.RootfsImage) {
					isRootfs = true
				}
			}
			envs = maps.Merge(envs, maps.FromSlice(val.Config.Env))
			cmds = append(cmds, val.Config.Cmd...)
			entrypoints = append(entrypoints, val.Config.Entrypoint...)
		}
	}
	delete(envs, "PATH")
	if isRootfs {
		maps.SetKeys(labels, v1beta1.ImageTypeKeys, string(v1beta1.RootfsImage))
	}
	for i, label := range labels {
		labels[i] = "\"" + escapeDollarSign(label, false) + "\""
	}
	for i, entrypoint := range entrypoints {
		entrypoints[i] = "\"" + escapeDollarSign(entrypoint, true) + "\""
	}
	for i, cmd := range cmds {
		cmds[i] = "\"" + escapeDollarSign(cmd, true) + "\""
	}
	t := template.New("")
	t, err := t.Parse(
		`FROM scratch
MAINTAINER labring
{{- if .Labels }}
LABEL {{ .Labels }}
{{- end }}
{{- if .Envs }}
ENV {{ .Envs }}
{{- end }}
{{- if .Entrypoints }}
ENTRYPOINT [{{ .Entrypoints }}]
{{- end }}
{{- if .CMDs }}
CMD [{{ .CMDs }}]
{{- end }}
{{- if .Images }}
{{- range .Images }}
COPY --from={{.}}   . .
{{- end }}
{{- end }}`)
	if err != nil {
		return "", err
	}
	data := map[string]any{
		"Labels":      maps.ToString(labels, " \\\n\t"),
		"Envs":        maps.ToString(envs, " \\\n\t"),
		"Entrypoints": strings.Join(entrypoints, ","),
		"CMDs":        strings.Join(cmds, ","),
		"Images":      imageNames,
	}

	out := bytes.NewBuffer(nil)
	err = t.Execute(out, data)
	if err != nil {
		return "", err
	}
	return out.String(), nil
}
