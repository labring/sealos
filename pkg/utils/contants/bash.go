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

package contants

import "fmt"

const (
	defaultBashFmt      = "cd %s && bash %s"
	renderInit          = "init"
	renderClean         = "clean"
	renderInitRegistry  = "init-registry"
	renderCleanRegistry = "clean-registry"
	renderAuth          = "auth"
)

type Bash interface {
	InitBash() string
	CleanBash() string
	AuthBash() string
	InitRegistryBash() string
	CleanRegistryBash() string
}

type bash struct {
	data   Data
	render map[string]string
}

func (b *bash) InitBash() string {
	return fmt.Sprintf(defaultBashFmt, b.data.ScriptsPath(), b.render[renderInit])
}

func (b *bash) CleanBash() string {
	return fmt.Sprintf(defaultBashFmt, b.data.ScriptsPath(), b.render[renderClean])
}

func (b *bash) AuthBash() string {
	return fmt.Sprintf(defaultBashFmt, b.data.ScriptsPath(), b.render[renderAuth])
}

func (b *bash) InitRegistryBash() string {
	return fmt.Sprintf(defaultBashFmt, b.data.ScriptsPath(), b.render[renderInitRegistry])
}

func (b *bash) CleanRegistryBash() string {
	return fmt.Sprintf(defaultBashFmt, b.data.ScriptsPath(), b.render[renderCleanRegistry])
}

func NewBash(clusterName string, render map[string]string) Bash {
	return &bash{data: NewData(clusterName), render: render}
}
