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
	"fmt"
	"github.com/docker/docker/api/types/registry"
	"github.com/labring/sealos/pkg/utils/file"
	"path"

	"github.com/labring/sealos/pkg/sreg/registry/save"

	v1 "github.com/opencontainers/image-spec/specs-go/v1"
	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/sreg/buildimage"
	"github.com/labring/sealos/pkg/utils/logger"
)

func NewRegistryImageSaveCmd(examplePrefix string) *cobra.Command {
	var auth map[string]registry.AuthConfig
	var images, tars []string
	flagsResults := registrySaveRawResults{
		registrySaveResults: new(registrySaveResults),
	}
	cmd := &cobra.Command{
		Use:   "save",
		Short: "save images to local registry dir",
		Example: fmt.Sprintf(`
%[1]s save --registry-dir=/tmp/registry .
%[1]s save --registry-dir=/tmp/registry --images=containers-storage:docker.io/labring/coredns:v0.0.1
%[1]s save --registry-dir=/tmp/registry --images=docker-daemon:docker.io/library/nginx:latest
%[1]s save --registry-dir=/tmp/registry --tars=docker-archive:/root/config_main.tar@library/config_main
%[1]s save --registry-dir=/tmp/registry --tars=oci-archive:/root/config_main.tar@library/config_main
%[1]s save --registry-dir=/tmp/registry --images=docker.io/library/busybox:latest`, examplePrefix),
		RunE: func(cmd *cobra.Command, args []string) error {
			if len(images) > 0 {
				is := save.NewImageSaver(context.Background(), flagsResults.registryPullMaxPullProcs, auth, flagsResults.all)
				outImages, err := is.SaveImages(images, flagsResults.registryPullRegistryDir, v1.Platform{OS: "linux", Architecture: flagsResults.registryPullArch})
				if err != nil {
					return err
				}
				logger.Info("images pulled: %+v", outImages)
			}

			if len(tars) > 0 {
				tarIs := save.NewImageTarSaver(context.Background(), flagsResults.registryPullMaxPullProcs, flagsResults.all)
				outTars, err := tarIs.SaveImages(tars, flagsResults.registryPullRegistryDir, v1.Platform{OS: "linux", Architecture: flagsResults.registryPullArch})
				if err != nil {
					return err
				}
				logger.Info("images tar saved: %+v", outTars)
			}
			return nil
		},
		PreRunE: func(cmd *cobra.Command, args []string) error {
			if len(args) == 0 && len(flagsResults.images) == 0 && len(flagsResults.tars) == 0 {
				return errors.New("'--images' '--tars' and args cannot be empty at the same time")
			}
			var err error
			if len(args) == 0 {
				if len(flagsResults.images) > 0 {
					images = flagsResults.images
				}
				if len(flagsResults.tars) > 0 {
					tars = flagsResults.tars
				}
			} else {
				images, err = buildimage.List(args[0])
				if err != nil {
					return err
				}
				ignore := path.Join(path.Dir(args[0]), ".sealignore")
				if file.IsExist(ignore) {
					images, err = buildimage.Filter(images, ignore)
					if err != nil {
						return err
					}
				}
				tars, err = buildimage.TarList(args[0])
				if err != nil {
					return err
				}

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
