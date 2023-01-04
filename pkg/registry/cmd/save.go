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

	"github.com/pkg/errors"

	"github.com/docker/docker/api/types"
	v1 "github.com/opencontainers/image-spec/specs-go/v1"
	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/buildimage"
	"github.com/labring/sealos/pkg/registry"
	"github.com/labring/sealos/pkg/utils/logger"
)

func newRegistryImageSaveCmd() *cobra.Command {
	var registryImagePullCmd = &cobra.Command{
		Use:   "save",
		Short: "save registry images to local registry dir",
	}
	registryImagePullCmd.AddCommand(saveCmd("default"))
	registryImagePullCmd.AddCommand(saveCmd("raw"))
	return registryImagePullCmd
}

func saveCmd(cmdType string) *cobra.Command {
	switch cmdType {
	case "raw":
		return saveRawCmd()
	case "default":
		return saveDefaultCmd()
	default:
		return saveDefaultCmd()
	}
}
func saveDefaultCmd() *cobra.Command {
	var images []string
	var auth map[string]types.AuthConfig
	flagsResults := registrySaveDefaultResults{
		registrySaveResults: new(registrySaveResults),
	}
	var registryImagePullDefault = &cobra.Command{
		Use:   "default [CONTEXT]",
		Short: "registry images manager save to local dir by default type",
		Run: func(cmd *cobra.Command, args []string) {
			is := registry.NewImageSaver(context.Background(), flagsResults.registryPullMaxPullProcs, auth)
			outImages, err := is.SaveImages(images, flagsResults.registryPullRegistryDir, v1.Platform{OS: "linux", Architecture: flagsResults.registryPullArch})
			if err != nil {
				logger.Error("pull registry images is error: %s", err.Error())
				os.Exit(1)
			}
			logger.Info("pull images list save to local : %+v", outImages)
		},
		Args: cobra.ExactArgs(1),
		PreRunE: func(cmd *cobra.Command, args []string) error {
			var err error
			images, err = buildimage.List(args[0])
			if err != nil {
				return err
			}
			auth, err = flagsResults.CheckAuth()
			if err != nil {
				return err
			}
			return nil
		},
	}
	flags := registryImagePullDefault.Flags()
	flags.SetInterspersed(false)
	flagsResults.RegisterFlags(flags)
	return registryImagePullDefault
}

func saveRawCmd() *cobra.Command {
	var auth map[string]types.AuthConfig
	flagsResults := registrySaveRawResults{
		registrySaveResults: new(registrySaveResults),
	}
	var registryImagePullRaw = &cobra.Command{
		Use:   "raw",
		Short: "registry images manager save to local dir by raw type",
		RunE: func(cmd *cobra.Command, args []string) error {
			is := registry.NewImageSaver(context.Background(), flagsResults.registryPullMaxPullProcs, auth)
			outImages, err := is.SaveImages(flagsResults.images, flagsResults.registryPullRegistryDir, v1.Platform{OS: "linux", Architecture: flagsResults.registryPullArch})
			if err != nil {
				return errors.Wrap(err, "pull registry images is error")
			}
			logger.Info("pull images list save to local : %+v", outImages)
			return nil
		},
		PreRunE: func(cmd *cobra.Command, args []string) error {
			var err error
			auth, err = flagsResults.CheckAuth()
			if err != nil {
				return err
			}
			return nil
		},
	}
	flags := registryImagePullRaw.Flags()
	flags.SetInterspersed(false)
	flagsResults.RegisterFlags(flags)
	_ = registryImagePullRaw.MarkFlagRequired("images")
	return registryImagePullRaw
}
