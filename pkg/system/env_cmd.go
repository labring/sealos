/*
Copyright 2023 cuisongliu@qq.com.

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

package system

import (
	"fmt"

	"github.com/spf13/cobra"
)

func NewEnvCmd() *cobra.Command {
	var configCmd = &cobra.Command{
		Use:   "env",
		Short: "Display all envs for sealos",
		RunE: func(cmd *cobra.Command, args []string) error {
			list := ConfigOptions()
			for _, v := range list {
				data, _ := GetConfig(v.Key)
				if data == nil {
					continue
				}
				println(fmt.Sprintf("%s=%s", data.OSEnv, data.DefaultValue))
			}
			return nil
		},
	}
	return configCmd
}
