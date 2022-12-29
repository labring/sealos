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

package buildimage

// nosemgrep: go.lang.security.audit.xss.import-text-template.import-text-template
import (
	"bytes"
	"strings"
	"text/template"

	v1 "github.com/opencontainers/image-spec/specs-go/v1"

	"github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/maps"
)

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
			labels = maps.MergeMap(labels, val.Config.Labels)
			if val.Config.Labels != nil && val.Config.Labels[v1beta1.ImageTypeKey] == string(v1beta1.RootfsImage) {
				isRootfs = true
			}
			envs = maps.MergeMap(envs, maps.ListToMap(val.Config.Env))
			cmds = append(cmds, val.Config.Cmd...)
			entrypoints = append(entrypoints, val.Config.Entrypoint...)
		}
	}
	delete(envs, "PATH")
	if isRootfs {
		labels[v1beta1.ImageTypeKey] = string(v1beta1.RootfsImage)
	}
	for i, label := range labels {
		labels[i] = "\"" + strings.ReplaceAll(label, "$", "\\$") + "\""
	}
	for i, entrypoint := range entrypoints {
		entrypoints[i] = "\"" + strings.ReplaceAll(entrypoint, "$", "\\$") + "\""
	}
	for i, cmd := range cmds {
		cmds[i] = "\"" + strings.ReplaceAll(cmd, "$", "\\$") + "\""
	}
	t := template.New("")
	t, err := t.Parse(
		`FROM scratch
MAINTAINER labring
{{- if .Labels }}
{{- range $key, $val := .Labels }}
LABEL {{ $key }}={{ $val }}
{{- end }}
{{- end }}
{{- if .Envs }}
{{- range $key, $val := .Envs }}
ENV {{ $key }}={{ $val }}
{{- end }}
{{- end }}
{{- if .Entrypoints }}
ENTRYPOINT [{{ .Entrypoints }}]
{{- end }}
{{- if .CMDs }}
CMD [{{ .CMDs }}]
{{- end }}
{{- if .Images }}
{{- range .Images }}
COPY --from={{.}}  . .
{{- end }}
{{- end }}`)
	if err != nil {
		return "", err
	}
	data := map[string]any{
		"Labels":      labels,
		"Envs":        envs,
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
