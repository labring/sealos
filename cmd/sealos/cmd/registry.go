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

package cmd

import (
	sregcmd "github.com/labring/sreg/pkg/registry/commands"
	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/registry/commands"
)

func newRegistryCmd(examplePrefix string) *cobra.Command {
	var cmd = &cobra.Command{
		Use:   "registry",
		Short: "registry related",
	}
	examplePrefix = examplePrefix + " registry"
	cmd.AddCommand(commands.NewRegistryPasswdCmd())
	cmd.AddCommand(sregcmd.NewServeRegistryCommand())
	cmd.AddCommand(sregcmd.NewRegistryImageSaveCmd(examplePrefix))
	cmd.AddCommand(sregcmd.NewSyncRegistryCommand(examplePrefix))
	cmd.AddCommand(sregcmd.NewCopyRegistryCommand(examplePrefix))
	return cmd
}
