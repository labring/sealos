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
	"os"

	"github.com/docker/docker/api/types"
	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/registry"
	"github.com/labring/sealos/pkg/utils/logger"
)

func NewRegistryListCmd() *cobra.Command {
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
	var registryImageListCmd = &cobra.Command{
		Use:     "list",
		Short:   "registry list",
		Example: "sealctl registry list",
		RunE: func(cmd *cobra.Command, args []string) error {
			is.ListRegistry()
			return nil
		},
		PreRun: func(cmd *cobra.Command, args []string) {
			auth = preValidate()
			is = registry.NewImage(auth)
		},
	}

	return registryImageListCmd
}

func NewRegistryImageCmd() *cobra.Command {
	var registryName string
	var registryImageCmd = &cobra.Command{
		Use:   "image",
		Short: "registry images manager",
	}

	registryImageCmd.PersistentFlags().StringVarP(&registryName, "name", "n", "sealos.hub:5000", "registry name")

	registryImageCmd.AddCommand(NewRegistryListImageCmd(registryName))
	registryImageCmd.AddCommand(NewRegistryImageRmiCmd(registryName))

	return registryImageCmd
}

func NewRegistryListImageCmd(registryName string) *cobra.Command {
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
	var registryImageListCmd = &cobra.Command{
		Use:     "list",
		Short:   "registry list image",
		Example: "sealctl registry image list",
		Args:    cobra.ExactArgs(0),
		RunE: func(cmd *cobra.Command, args []string) error {
			is.ListImages(registryName, registryName)
			return nil
		},
		PreRun: func(cmd *cobra.Command, args []string) {
			auth = preValidate()
			is = registry.NewImage(auth)
		},
	}

	return registryImageListCmd
}
