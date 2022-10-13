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
	"strings"

	"k8s.io/apimachinery/pkg/util/validation/field"

	"github.com/pkg/errors"

	"github.com/docker/docker/api/types"
	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/registry"
	"github.com/labring/sealos/pkg/utils/logger"
)

func NewRegistryImageRmiCmd(registryName string) *cobra.Command {
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
		Use:     "rmi",
		Short:   "registry rmi image",
		Example: "sealctl registry image rmi labring/lvscare:v4.1.3",
		Args:    cobra.MinimumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			imageList := args
			errorList := field.ErrorList{}
			for i := range imageList {
				imageList[i] = strings.ReplaceAll(imageList[i], fmt.Sprintf("%s/", registryName), "")
				err := is.RmiImage(registryName, imageList[i])
				if err != nil {
					errorList = append(errorList, field.Invalid(field.NewPath("image"), imageList[i], err.Error()))
				}
			}
			return errorList.ToAggregate()
		},
		PreRunE: func(cmd *cobra.Command, args []string) error {
			auth = preValidate()
			is = registry.NewImage(auth)
			if registryName == "" {
				return errors.New("registryName not allow empty")
			}
			return nil
		},
	}

	return registryImageListCmd
}
