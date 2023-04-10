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

func NewConfigCmd() *cobra.Command {
	sample, _ := NewExampleConfig()
	var configCmd = &cobra.Command{
		Use:   "config",
		Short: "Display or change configuration settings for sealos",
		Long:  sample,
	}
	configCmd.AddCommand(newGetCmd())
	configCmd.AddCommand(newListCmd())
	configCmd.AddCommand(newSetCmd())
	return configCmd
}

func newGetCmd() *cobra.Command {
	var getCmd = &cobra.Command{
		Use:     "get <key>",
		Short:   "Print the value of a given configuration key",
		Args:    cobra.ExactArgs(1),
		Example: `sealos config get prompt`,
		RunE: func(cmd *cobra.Command, args []string) error {
			data, err := Get(args[0])
			if err != nil {
				return err
			}
			println(data)
			return nil
		},
	}
	return getCmd
}

func newSetCmd() *cobra.Command {
	var getCmd = &cobra.Command{
		Use:     "set <key> <value>",
		Short:   "Update configuration with a value for the given key",
		Args:    cobra.ExactArgs(2),
		Example: `sealos config set prompt disabled`,
		RunE: func(cmd *cobra.Command, args []string) error {
			return Set(args[0], args[1])
		},
	}
	return getCmd
}

func newListCmd() *cobra.Command {
	var getCmd = &cobra.Command{
		Use:   "list",
		Short: "Print a list of configuration keys and values",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			list := ConfigOptions()
			for _, v := range list {
				data, _ := Get(v.Key)
				println(fmt.Sprintf("%s=%s", v.Key, data))
			}
			return nil
		},
	}
	return getCmd
}
