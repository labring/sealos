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
	DefaultLnFmt        = "rm -rf %[2]s && ln -s %[1]s %[2]s"
	CdAndExecCmd        = "cd %s && %s"
	renderInit          = "init"
	renderClean         = "clean"
	renderInitCRI       = "init-cri"
	renderCleanCRI      = "clean-cri"
	renderInitRegistry  = "init-registry"
	renderCleanRegistry = "clean-registry"
	renderCheck         = "check"
	DefaultChmodBash    = "cd %s && chmod -R 0755 *"
)

type Bash interface {
	InitBash(host string) string
	CleanBash(host string) string
	InitRegistryBash(host string) string
	CleanRegistryBash(host string) string
	CheckBash(host string) string
	InitCRIBash(host string) string
	CleanCRIBash(host string) string
	WrapBash(host string, shell string) string
}

type bash struct {
	pathResolver  PathResolver
	renderContext map[string]string
	wrap          func(string, string) string
}

func (b *bash) getFromRenderContextOrDefault(key string) string {
	if val, ok := b.renderContext[key]; ok {
		return fmt.Sprintf("bash %s", val)
	}
	return fmt.Sprintf("bash %s.sh", key)
}

func (b *bash) getFromRenderContext(key string) string {
	if val, ok := b.renderContext[key]; ok {
		return fmt.Sprintf("bash %s", val)
	}
	return ""
}

func (b *bash) WrapBash(host, shell string) string {
	if shell == "" {
		return ""
	}
	return fmt.Sprintf(DefaultBashFmt, b.pathResolver.RootFSScriptsPath(), b.wrap(host, shell))
}

func (b *bash) CheckBash(host string) string {
	return b.WrapBash(host, b.getFromRenderContextOrDefault(renderCheck))
}

func (b *bash) InitBash(host string) string {
	return b.WrapBash(host, b.getFromRenderContextOrDefault(renderInit))
}

func (b *bash) CleanBash(host string) string {
	return b.WrapBash(host, b.getFromRenderContextOrDefault(renderClean))
}

func (b *bash) InitRegistryBash(host string) string {
	return b.WrapBash(host, b.getFromRenderContextOrDefault(renderInitRegistry))
}

func (b *bash) CleanRegistryBash(host string) string {
	return b.WrapBash(host, b.getFromRenderContextOrDefault(renderCleanRegistry))
}

func (b *bash) InitCRIBash(host string) string {
	return b.WrapBash(host, b.getFromRenderContext(renderInitCRI))
}
func (b *bash) CleanCRIBash(host string) string {
	return b.WrapBash(host, b.getFromRenderContext(renderCleanCRI))
}

func NewBash(clusterName string, renderContext map[string]string, shellWrapper func(string, string) string) Bash {
	return &bash{pathResolver: NewPathResolver(clusterName), renderContext: renderContext, wrap: shellWrapper}
}
