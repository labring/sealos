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

package commands

import (
	"context"
	"errors"

	"github.com/docker/docker/api/types"
	v1 "github.com/opencontainers/image-spec/specs-go/v1"
	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/buildimage"
	"github.com/labring/sealos/pkg/registry"
	"github.com/labring/sealos/pkg/utils/logger"
)

func NewRegistryImageSaveCmd() *cobra.Command {
	var auth map[string]types.AuthConfig
	var images []string
	flagsResults := registrySaveRawResults{
		registrySaveResults: new(registrySaveResults),
	}
	cmd := &cobra.Command{
		Use:   "save",
		Short: "save images to local registry dir",
		RunE: func(cmd *cobra.Command, args []string) error {
			is := registry.NewImageSaver(context.Background(), flagsResults.registryPullMaxPullProcs, auth)
			outImages, err := is.SaveImages(images, flagsResults.registryPullRegistryDir, v1.Platform{OS: "linux", Architecture: flagsResults.registryPullArch})
			if err != nil {
				return err
			}
			logger.Info("images pulled: %+v", outImages)
			return nil
		},
		PreRunE: func(cmd *cobra.Command, args []string) error {
			if len(args) == 0 || len(flagsResults.images) == 0 {
				return errors.New("'--images' and args cannot be empty at the same time")
			}
			var err error
			if len(flagsResults.images) > 0 {
				images = flagsResults.images
			} else {
				images, err = buildimage.List(args[0])
			}
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
	fs := cmd.Flags()
	fs.SetInterspersed(false)
	flagsResults.RegisterFlags(fs)
	return cmd
}
