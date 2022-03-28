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

package v1beta1

import (
	"strings"

	"github.com/fanux/sealos/pkg/utils/fork/golang/expansion"
	v1 "github.com/opencontainers/image-spec/specs-go/v1"
)

// ConvertEnv []string to map[string]interface{}, example [IP=127.0.0.1,IP=192.160.0.2,Key=value] will convert to {IP:[127.0.0.1,192.168.0.2],key:value}
func ConvertEnv(envList []string) (env map[string]interface{}) {
	temp := make(map[string][]string)
	env = make(map[string]interface{})

	for _, e := range envList {
		var kv []string
		if kv = strings.SplitN(e, "=", 2); len(kv) != 2 {
			continue
		}

		temp[kv[0]] = append(temp[kv[0]], kv[1])
	}

	for k, v := range temp {
		if len(v) > 1 {
			env[k] = v
			continue
		}
		if len(v) == 1 {
			env[k] = v[0]
		}
	}

	return
}

func ConvertCMDRun() {

}

// ExpandCommandAndArgs expands the given Cluster's command by replacing variable references `with the values of given EnvVar.
func (c *Cluster) ExpandCommandAndArgs(envs map[string]string, image v1.Image) (command []string, args []string) {
	mapping := expansion.MappingFuncFor(envs)

	if len(c.Spec.Command) != 0 {
		for _, cmd := range c.Spec.Command {
			command = append(command, expansion.Expand(cmd, mapping))
		}
	}

	if len(c.Spec.Args) != 0 {
		for _, arg := range c.Spec.Args {
			args = append(args, expansion.Expand(arg, mapping))
		}
	}

	if len(command) == 0 {
		command = image.Config.Entrypoint
	}

	if len(args) == 0 {
		args = image.Config.Cmd
	}

	return command, args
}
