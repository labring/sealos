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
	"errors"
	"fmt"

	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/registry/password"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/logger"
)

func newRegistryPasswdCmd() *cobra.Command {
	flagsResults := password.RegistryPasswdResults{}
	var cluster *v2.Cluster

	var registryPasswdCmd = &cobra.Command{
		Use:   "passwd",
		Short: "update registry password",
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := flagsResults.Apply(cluster); err != nil {
				return fmt.Errorf("registry passwd apply error: %v", err)
			}
			logger.Info("registry passwd apply success")
			return nil
		},
		PreRunE: func(cmd *cobra.Command, args []string) error {
			cluster = flagsResults.Validate()
			if cluster == nil {
				return errors.New("registry passwd validate error")
			}
			return nil
		},
	}
	flags := registryPasswdCmd.Flags()
	flags.SetInterspersed(false)
	flagsResults.RegisterFlags(flags)
	return registryPasswdCmd
}
