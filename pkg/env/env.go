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

import (
	"fmt"
	"html/template"
	"os"
	"path/filepath"
	"strings"

	"github.com/fanux/sealos/pkg/types/v1beta1"
	strlib "github.com/fanux/sealos/pkg/utils/strings"
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
}

func NewEnvProcessor(cluster *v1beta1.Cluster) Interface {
	return &processor{cluster}
}
func (p *processor) WrapperEnv(host string) map[string]string {
	env := make(map[string]string)
	for k, v := range p.getHostEnv(host) {
		switch value := v.(type) {
		case []string:
			env[k] = strings.Join(value, " ")
		case string:
			env[k] = value
		}
	}
	return env
}
func (p *processor) WrapperShell(host, shell string) string {
	var env string
	for k, v := range p.getHostEnv(host) {
		switch value := v.(type) {
		case []string:
			env = fmt.Sprintf("%s%s=(%s) ", env, k, strings.Join(value, " "))
		case string:
			env = fmt.Sprintf("%s%s=\"%s\" ", env, k, value)
		}
	}
	if env == "" {
		return shell
	}
	return fmt.Sprintf("%s&& %s", env, shell)
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

func mergeList(dst, src []string) []string {
	for _, s := range src {
		if strlib.InList(s, dst) {
			continue
		}
		dst = append(dst, s)
	}
	return dst
}

// Merge the host ENV and global env, the host env will overwrite cluster.Spec.Env
func (p *processor) getHostEnv(hostIP string) (env map[string]interface{}) {
	var hostEnv []string

	for _, host := range p.Spec.Hosts {
		for _, ip := range host.IPS {
			if ip == hostIP {
				hostEnv = host.Env
			}
		}
	}

	hostEnv = mergeList(hostEnv, p.Spec.Env)

	return v1beta1.ConvertEnv(hostEnv)
}
