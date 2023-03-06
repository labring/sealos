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
	DefaultBashFmt      = "cd %s && %s"
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
	InitBash(host string) string
	CleanBash(host string) string
	AuthBash(host string) string
	InitRegistryBash(host string) string
	CleanRegistryBash(host string) string
	CheckBash(host string) string
}

type bash struct {
	data         Data
	render       map[string]string
	shellWrapper func(string, string) string
}

func (b *bash) defaultBashVal(key string) string {
	if val, ok := b.render[key]; ok {
		return fmt.Sprintf("bash %s", val)
	}
	return fmt.Sprintf("bash %s.sh", key)
}

func (b *bash) shellWrapperBash(host, shell string) string {
	return fmt.Sprintf(DefaultBashFmt, b.data.RootFSScriptsPath(), b.shellWrapper(host, shell))
}

func (b *bash) CheckBash(host string) string {
	return b.shellWrapperBash(host, b.defaultBashVal(renderCheck))
}

func (b *bash) InitBash(host string) string {
	return b.shellWrapperBash(host, b.defaultBashVal(renderInit))
}

func (b *bash) CleanBash(host string) string {
	return b.shellWrapperBash(host, b.defaultBashVal(renderClean))
}

func (b *bash) AuthBash(host string) string {
	return b.shellWrapperBash(host, b.defaultBashVal(renderAuth))
}

func (b *bash) InitRegistryBash(host string) string {
	return b.shellWrapperBash(host, b.defaultBashVal(renderInitRegistry))
}

func (b *bash) CleanRegistryBash(host string) string {
	return b.shellWrapperBash(host, b.defaultBashVal(renderCleanRegistry))
}

func NewBash(clusterName string, render map[string]string, shellWrapper func(string, string) string) Bash {
	return &bash{data: NewData(clusterName), render: render, shellWrapper: shellWrapper}
}
