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

package constants

import "fmt"

const (
	DefaultBashFmt      = "cd %s && bash %s"
	DefaultCPFmt        = "mkdir -p %s && cp -rf  %s/* %s/"
	DefaultLnFmt        = "ln -s %s %s"
	CdAndExecCmd        = "cd %s && %s"
	renderInit          = "init"
	renderClean         = "clean"
	renderInitRegistry  = "init-registry"
	renderCleanRegistry = "clean-registry"
	renderAuth          = "auth"
	renderCheck         = "check"
	DefaultChmodBash    = "cd %s && chmod -R 0755 *"
)

type Bash interface {
	InitBash() string
	CleanBash() string
	AuthBash() string
	InitRegistryBash() string
	CleanRegistryBash() string
	CheckBash() string
}

type bash struct {
	data   Data
	render map[string]string
}

func (b *bash) CheckBash() string {
	if val, ok := b.render[renderCheck]; ok {
		return fmt.Sprintf(DefaultBashFmt, b.data.RootFSScriptsPath(), val)
	}
	return "check.sh"
}

func (b *bash) InitBash() string {
	if val, ok := b.render[renderInit]; ok {
		return fmt.Sprintf(DefaultBashFmt, b.data.RootFSScriptsPath(), val)
	}
	return "init.sh"
}

func (b *bash) CleanBash() string {
	if val, ok := b.render[renderClean]; ok {
		return fmt.Sprintf(DefaultBashFmt, b.data.RootFSScriptsPath(), val)
	}
	return "clean.sh"
}

func (b *bash) AuthBash() string {
	if val, ok := b.render[renderAuth]; ok {
		return fmt.Sprintf(DefaultBashFmt, b.data.RootFSScriptsPath(), val)
	}
	return "auth.sh"
}

func (b *bash) InitRegistryBash() string {
	if val, ok := b.render[renderInitRegistry]; ok {
		return fmt.Sprintf(DefaultBashFmt, b.data.RootFSScriptsPath(), val)
	}
	return "init-registry.sh"
}

func (b *bash) CleanRegistryBash() string {
	if val, ok := b.render[renderCleanRegistry]; ok {
		return fmt.Sprintf(DefaultBashFmt, b.data.RootFSScriptsPath(), val)
	}
	return "clean-registry.sh"
}

func NewBash(clusterName string, render map[string]string) Bash {
	return &bash{data: NewData(clusterName), render: render}
}
