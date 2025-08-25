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

package commands

import (
	"fmt"

	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/registry/password"
	"github.com/labring/sealos/pkg/utils/logger"
)

func NewRegistryPasswdCmd() *cobra.Command {
	flagsResults := password.RegistryPasswdResults{}

	var registryPasswdCmd = &cobra.Command{
		Use:   "passwd",
		Short: "configure registry password",
		RunE: func(cmd *cobra.Command, args []string) error {
			cluster, err := flagsResults.Validate()
			if err != nil {
				return err
			}
			if cluster == nil {
				logger.Error("registry passwd apply error: cluster is nil")
				return nil
			}
			if err := flagsResults.Apply(cluster); err != nil {
				return fmt.Errorf("registry passwd apply error: %v", err)
			}
			logger.Info("registry passwd apply success")
			return nil
		},
	}
	flags := registryPasswdCmd.Flags()
	flags.SetInterspersed(false)
	flagsResults.RegisterFlags(flags)
	return registryPasswdCmd
}
