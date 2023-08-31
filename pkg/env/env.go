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
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/labring/sealos/pkg/template"
	"github.com/labring/sealos/pkg/types/v1beta1"
	fileutil "github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/maps"
	stringsutil "github.com/labring/sealos/pkg/utils/strings"
)

const templateSuffix = ".tmpl"

type Interface interface {
	// WrapShell :If host already set env like DATADISK=/data
	// This function add env to the shell, like:
	// Input shell: cat /etc/hosts
	// Output shell: DATADISK=/data cat /etc/hosts
	// So that you can get env values in you shell script
	WrapShell(host, shell string) string
	// RenderAll :render env to all the files in dir
	RenderAll(host, dir string, envs map[string]string) error
	Getenv(host string) map[string]string
}

type processor struct {
	*v1beta1.Cluster
	cache map[string]map[string]string
	mu    sync.Mutex
}

func NewEnvProcessor(cluster *v1beta1.Cluster) Interface {
	return &processor{
		Cluster: cluster,
		cache:   make(map[string]map[string]string),
	}
}

func (p *processor) Getenv(host string) map[string]string {
	env := make(map[string]string)
	envs := p.getHostEnvInCache(host)
	for k, v := range envs {
		env[k] = v
	}
	return env
}

func (p *processor) WrapShell(host, shell string) string {
	envs := p.getHostEnvInCache(host)
	return stringsutil.RenderShellFromEnv(shell, envs)
}

func (p *processor) RenderAll(host, dir string, envs map[string]string) error {
	return filepath.Walk(dir, func(path string, info os.FileInfo, errIn error) error {
		if errIn != nil {
			return errIn
		}
		if info.IsDir() || !strings.HasSuffix(info.Name(), templateSuffix) {
			return nil
		}
		fileName := strings.TrimSuffix(path, templateSuffix)
		if fileutil.IsExist(fileName) {
			if err := os.Remove(fileName); err != nil {
				logger.Warn(err)
			}
		}

		writer, err := os.OpenFile(fileName, os.O_CREATE|os.O_RDWR, os.ModePerm)
		if err != nil {
			return fmt.Errorf("failed to open file [%s] when render env: %v", path, err)
		}

		defer writer.Close()
		body, err := fileutil.ReadAll(path)
		if err != nil {
			return err
		}

		t, isOk, err := template.TryParse(string(body))
		if isOk {
			if err != nil {
				return fmt.Errorf("failed to create template: %s %v", path, err)
			}
			if host != "" {
				data := maps.MergeMap(envs, p.getHostEnvInCache(host))
				if err := t.Execute(writer, data); err != nil {
					return fmt.Errorf("failed to render env template: %s %v", path, err)
				}
			}
		} else {
			return errors.New("parse template failed")
		}
		return nil
	})
}

func (p *processor) getHostEnvInCache(hostIP string) map[string]string {
	if v, ok := p.cache[hostIP]; ok {
		return v
	}
	p.mu.Lock()
	defer p.mu.Unlock()
	v := p.getHostEnv(hostIP)
	p.cache[hostIP] = v
	return v
}

// Merge the host ENV and global env, the host env will overwrite cluster.Spec.Env
func (p *processor) getHostEnv(hostIP string) map[string]string {
	// TODO: what if hostIP not found?
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

	excludeSysEnv := func(m map[string]string) map[string]string {
		m, exclude := ExcludeKeysWithPrefix(m, "SEALOS_SYS")
		if len(exclude) > 0 {
			logger.Warn("skip %s cause envs with prefix SEALOS_SYS are sealos system only", strings.Join(exclude, ", "))
		}
		return m
	}

	envs := maps.MergeMap(excludeSysEnv(specEnvMap), excludeSysEnv(hostEnvMap))
	return envs
}

func ExcludeKeysWithPrefix(m map[string]string, prefix string) (map[string]string, []string) {
	out := make(map[string]string, 0)
	var exclude []string
	for k, v := range m {
		if strings.HasPrefix(k, prefix) {
			exclude = append(exclude, k)
		} else {
			out[k] = v
		}
	}
	return out, exclude
}
