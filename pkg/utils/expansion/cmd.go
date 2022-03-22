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

package expansion

// ConvertCommandAndArgs expands the given Container's command by replacing variable references `with the values of given EnvVar.
func ConvertCommandAndArgs(specCommands, specArgs []string, envs map[string]interface{}) (command []string, args []string) {
	mapping := MappingFuncFor(envs)
	if len(specCommands) != 0 {
		for _, cmd := range specCommands {
			command = append(command, Expand(cmd, mapping))
		}
	}

	if len(specArgs) != 0 {
		for _, arg := range specArgs {
			args = append(args, Expand(arg, mapping))
		}
	}

	return command, args
}
