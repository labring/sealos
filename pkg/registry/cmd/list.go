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
	"fmt"
	"os"

	"github.com/labring/sealos/pkg/registry"
	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/docker/docker/api/types"
	"github.com/spf13/cobra"
)

func newRegistryListImageCmd() *cobra.Command {
	preValidate := func() map[string]types.AuthConfig {
		cfg, err := registry.GetAuthInfo()
		if err != nil {
			logger.Error("auth info is error: %+v", err)
			os.Exit(1)
		}
		return cfg
	}
	var auth map[string]types.AuthConfig
	var is registry.Registry
	flagsResults := imagesResults{}
	var registryImageListCmd = &cobra.Command{
		Use:   "images",
		Short: "registry image list",
		Example: fmt.Sprintf(`Example:
  %[1]s registry images --filter name=public*
  %[1]s registry images --filter tag=*1.1*
  %[1]s registry images --filter tag=*sec
  %[1]s registry images --filter name=public,tag=v1.1.1
  %[1]s registry images --filter tag=<none>`, rootCmd.CommandPath()),
		Args: cobra.ExactArgs(0),
		RunE: func(cmd *cobra.Command, args []string) error {
			is.ListImages(flagsResults.registryName, flagsResults.filter, flagsResults.json)
			return nil
		},
		PreRunE: func(cmd *cobra.Command, args []string) error {
			auth = preValidate()
			is = registry.NewImage(auth)
			if _, ok := auth[flagsResults.registryName]; !ok {
				return fmt.Errorf("not found %s in auth info", flagsResults.registryName)
			}
			return nil
		},
	}
	flags := registryImageListCmd.Flags()
	flags.SetInterspersed(false)
	flagsResults.RegisterFlags(flags)
	return registryImageListCmd
}
