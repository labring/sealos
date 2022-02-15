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

package kustomize

import (
	"fmt"
	"path/filepath"

	"sigs.k8s.io/kustomize/api/konfig"
	"sigs.k8s.io/kustomize/api/konfig/builtinpluginconsts"
	"sigs.k8s.io/kustomize/api/krusty"
	"sigs.k8s.io/kustomize/api/resmap"
	"sigs.k8s.io/kustomize/api/types"
	"sigs.k8s.io/kustomize/kyaml/filesys"
)

func Init() {
	filesys.MakeFsInMemory()
}

type PatchConfig struct {
	fSys filesys.FileSystem
}

func New(fSys filesys.FileSystem) Interface {
	return &PatchConfig{fSys: fSys}
}

type Interface interface {
	GetFSys() filesys.FileSystem
	WriteKustomization(path string, content string) error
	WriteComponent(path string, content string) error
	WriteFile(path string, content string) error
	//WriteLegacyConfigs base/config/defaults.yaml
	WriteLegacyConfigs(fName string) error
	Run(path string, o krusty.Options) (resmap.ResMap, error)
	MakeOptionsPluginsDisabled() krusty.Options
	MakeOptionsPluginsEnable() krusty.Options
}

func (th *PatchConfig) GetFSys() filesys.FileSystem {
	return th.fSys
}

func (th *PatchConfig) WriteKustomization(path string, content string) error {
	err := th.fSys.WriteFile(
		filepath.Join(
			path,
			konfig.DefaultKustomizationFileName()), []byte(`
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
`+content))
	if err == nil {
		return nil
	}
	return fmt.Errorf("unexpected error while writing Kustomization to %s: %v", path, err)
}

func (th *PatchConfig) WriteComponent(path string, content string) error {
	err := th.fSys.WriteFile(
		filepath.Join(
			path,
			konfig.DefaultKustomizationFileName()), []byte(`
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component
`+content))
	if err == nil {
		return nil
	}
	return fmt.Errorf("unexpected error while writing Component to %s: %v", path, err)
}

func (th *PatchConfig) WriteFile(path string, content string) error {
	err := th.fSys.WriteFile(path, []byte(content))
	if err == nil {
		return nil
	}
	return fmt.Errorf("unexpected error while writing file to %s: %v", path, err)
}

func (th *PatchConfig) WriteLegacyConfigs(fName string) error {
	m := builtinpluginconsts.GetDefaultFieldSpecsAsMap()
	var content []byte
	for _, tCfg := range m {
		content = append(content, []byte(tCfg)...)
	}
	err := th.fSys.WriteFile(fName, content)
	if err == nil {
		return nil
	}
	return fmt.Errorf("unexpected error while unable to add file %s: %v", fName, err)
}

func (th *PatchConfig) Run(path string, o krusty.Options) (resmap.ResMap, error) {
	m, err := krusty.MakeKustomizer(&o).Run(th.fSys, path)
	if err != nil {
		return nil, fmt.Errorf("unexpected error while unable to run %s: %v", path, err)
	}
	return m, nil
}

func (th *PatchConfig) MakeOptionsPluginsDisabled() krusty.Options {
	return makeOptionsPluginsDisabled()
}

func (th *PatchConfig) MakeOptionsPluginsEnable() krusty.Options {
	return makeOptionsPluginsEnabled()
}

func makeOptionsPluginsEnabled() krusty.Options {
	pc := types.EnabledPluginConfig(types.BploLoadFromFileSys)
	o := *krusty.MakeDefaultOptions()
	o.PluginConfig = pc
	return o
}

func makeOptionsPluginsDisabled() krusty.Options {
	return *krusty.MakeDefaultOptions()
}
