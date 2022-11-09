// Copyright © 2021 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package env

// nosemgrep: go.lang.security.audit.xss.import-text-template.import-text-template
import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"text/template"

	"github.com/labring/sealos/pkg/utils/maps"
	strings2 "github.com/labring/sealos/pkg/utils/strings"

	"github.com/labring/sealos/pkg/types/v1beta1"
)

const templateSuffix = ".tmpl"

type Interface interface {
	// WrapperShell :If host already set env like DATADISK=/data
	// This function add env to the shell, like:
	// Input shell: cat /etc/hosts
	// Output shell: DATADISK=/data cat /etc/hosts
	// So that you can get env values in you shell script
	WrapperShell(host, shell string) string
	// RenderAll :render env to all the files in dir
	RenderAll(host, dir string) error
	WrapperEnv(host string) map[string]string
}

type processor struct {
	*v1beta1.Cluster
	//types.ImageListOCIV1
	mounts []v1beta1.MountImage
}

func NewEnvProcessor(cluster *v1beta1.Cluster, mounts []v1beta1.MountImage) Interface {
	return &processor{Cluster: cluster, mounts: mounts}
}
func (p *processor) WrapperEnv(host string) map[string]string {
	env := make(map[string]string)
	envs := p.getHostEnv(host)
	for k, v := range envs {
		env[k] = v
	}
	return env
}
func (p *processor) WrapperShell(host, shell string) string {
	envs := p.getHostEnv(host)
	return strings2.EnvFromMap(shell, envs)
}

func (p *processor) RenderAll(host, dir string) error {
	return filepath.Walk(dir, func(path string, info os.FileInfo, errIn error) error {
		if errIn != nil {
			return errIn
		}
		if info.IsDir() || !strings.HasSuffix(info.Name(), templateSuffix) {
			return nil
		}
		writer, err := os.OpenFile(strings.TrimSuffix(path, templateSuffix), os.O_CREATE|os.O_RDWR, os.ModePerm)
		if err != nil {
			return fmt.Errorf("failed to open file [%s] when render env: %v", path, err)
		}
		defer func() {
			_ = writer.Close()
		}()
		t, err := template.ParseFiles(path)
		if err != nil {
			return fmt.Errorf("failed to create template: %s %v", path, err)
		}
		if host != "" {
			if err := t.Execute(writer, p.getHostEnv(host)); err != nil {
				return fmt.Errorf("failed to render env template: %s %v", path, err)
			}
		}
		return nil
	})
}

// Merge the host ENV and global env, the host env will overwrite cluster.Spec.Env
func (p *processor) getHostEnv(hostIP string) map[string]string {
	var hostEnv []string
	for _, host := range p.Spec.Hosts {
		for _, ip := range host.IPS {
			if ip == hostIP {
				hostEnv = host.Env
			}
		}
	}
	hostEnvMap := maps.ListToMap(hostEnv)
	specEnvMap := maps.ListToMap(p.Spec.Env)
	var imageEnvMap map[string]string
	for _, img := range p.mounts {
		imageEnvMap = maps.MergeMap(imageEnvMap, img.Env)
	}
	envs := maps.MergeMap(imageEnvMap, specEnvMap, hostEnvMap)
	return envs
}
