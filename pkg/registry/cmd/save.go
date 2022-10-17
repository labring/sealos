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
	"context"
	"os"

	"github.com/docker/docker/api/types"
	v1 "github.com/opencontainers/image-spec/specs-go/v1"
	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/buildimage"
	"github.com/labring/sealos/pkg/registry"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
)

func NewSaveCmd(registryPullRegistryDir, registryPullArch string, registryPullMaxPullProcs int, cmdType string) *cobra.Command {
	preValidate := func() map[string]types.AuthConfig {
		if !file.IsExist(registryPullRegistryDir) {
			_ = os.MkdirAll(registryPullRegistryDir, 0755)
		}
		cfg, err := registry.GetAuthInfo()
		if err != nil {
			logger.Error("auth info is error: %+v", err)
			os.Exit(1)
		}
		return cfg
	}
	pullRawCmd := func() *cobra.Command {
		var imageFile string
		var auth map[string]types.AuthConfig
		var registryImagePullRaw = &cobra.Command{
			Use:   "raw",
			Short: "registry images manager save to local dir by raw type",
			Args:  cobra.ExactArgs(1),
			Run: func(cmd *cobra.Command, args []string) {
				var (
					imageContext = "."
				)
				if len(args) != 0 {
					imageContext = args[0]
				}
				images, err := buildimage.List(imageContext)
				if err != nil {
					logger.Error("get images list is error: %s", err.Error())
					os.Exit(1)
				}

				is := registry.NewImageSaver(context.Background(), registryPullMaxPullProcs, auth)
				outImages, err := is.SaveImages(images, registryPullRegistryDir, v1.Platform{OS: "linux", Architecture: registryPullArch})
				if err != nil {
					logger.Error("pull registry images is error: %s", err.Error())
					os.Exit(1)
				}
				logger.Info("pull images list save to local : %+v", outImages)
			},
			PreRun: func(cmd *cobra.Command, args []string) {
				auth = preValidate()
				if !file.IsExist(imageFile) {
					logger.Error("ImageFile path is not exist")
					os.Exit(1)
				}
			},
		}

		registryImagePullRaw.PersistentFlags().StringVarP(&imageFile, "image-file", "f", "ImageFile", "ImageFile path")
		return registryImagePullRaw
	}
	pullDefaultCmd := func() *cobra.Command {
		var images []string
		var auth map[string]types.AuthConfig
		var registryImagePullDefault = &cobra.Command{
			Use:   "default",
			Short: "registry images manager pull to local dir by default type",
			Run: func(cmd *cobra.Command, args []string) {
				is := registry.NewImageSaver(context.Background(), registryPullMaxPullProcs, auth)
				outImages, err := is.SaveImages(images, registryPullRegistryDir, v1.Platform{OS: "linux", Architecture: registryPullArch})
				if err != nil {
					logger.Error("pull registry images is error: %s", err.Error())
					os.Exit(1)
				}
				logger.Info("pull images list save to local : %+v", outImages)
			},
			PreRun: func(cmd *cobra.Command, args []string) {
				auth = preValidate()
			},
		}

		registryImagePullDefault.PersistentFlags().StringSliceVar(&images, "images", []string{}, "images list")
		return registryImagePullDefault
	}

	switch cmdType {
	case "raw":
		return pullRawCmd()
	case "default":
		return pullDefaultCmd()
	default:
		return pullDefaultCmd()
	}
}
