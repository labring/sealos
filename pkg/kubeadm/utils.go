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

package kubeadm

import (
	"bytes"
	"strings"
	"text/template"

	"github.com/fanux/sealos/pkg/kustomize"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/kustomize/kyaml/filesys"
)

const formatName = `
metadata:
  name: kubeadm`

func convertAppend(data string) string {
	data = data + formatName
	return data
}

func convertClean(data string) string {
	return strings.ReplaceAll(data, formatName, "")
}

func templateFromContent(templateContent string, param interface{}) (string, error) {
	tmpl := template.Must(template.New("text").Parse(templateContent))
	var buffer bytes.Buffer
	err := tmpl.Execute(&buffer, param)
	bs := buffer.Bytes()
	if nil != bs && len(bs) > 0 {
		return string(bs), nil
	}
	return "", err
}

func kustomization(kFile, kubeadm, patch string, plugin bool) (string, error) {
	th := kustomize.New(filesys.MakeFsInMemory())
	err := th.WriteKustomization(".", kFile)
	if err != nil {
		return "", err
	}
	err = th.WriteFile("kubeadm.yaml", convertAppend(kubeadm))
	if err != nil {
		return "", err
	}
	err = th.WriteFile("patch.yaml", patch)
	if err != nil {
		return "", err
	}
	options := th.MakeOptionsPluginsDisabled()
	if plugin {
		options = th.MakeOptionsPluginsEnable()
	}
	m, err := th.Run(".", options)
	if err != nil {
		return "", err
	}
	yaml, err := m.AsYaml()
	if err != nil {
		return "", err
	}
	return convertClean(string(yaml)), nil
}

func kFile(gvk v1.GroupVersionKind, patch bool) (string, error) {
	if !patch {
		kf := `resources:
- kubeadm.yaml`
		return kf, nil
	}
	kf := `resources:
- kubeadm.yaml
patchesJson6902:
- target:
    group: {{ .Group }}
    version: {{ .Version }}
    kind: {{ .Kind }}
    name: kubeadm
  path: patch.yaml`
	return templateFromContent(kf, gvk)
}
