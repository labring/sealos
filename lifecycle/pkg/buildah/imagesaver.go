// Copyright © 2022 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package buildah

import (
	"fmt"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/labring/sreg/pkg/registry/crane"
	"github.com/labring/sreg/pkg/registry/save"

	"github.com/containerd/containerd/platforms"
	"github.com/containers/buildah/pkg/parse"
	"github.com/containers/image/v5/types"
	v1 "github.com/opencontainers/image-spec/specs-go/v1"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"

	"github.com/labring/sreg/pkg/buildimage"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/utils/logger"
)

type saverOptions struct {
	maxPullProcs int
	enabled      bool
}

func (opts *saverOptions) RegisterFlags(fs *pflag.FlagSet) {
	fs.IntVar(&opts.maxPullProcs, "max-pull-procs", 5, "maximum number of goroutines for pulling")
	fs.BoolVar(&opts.enabled, "save-image", true, "store images that parsed from the specific directories")
}

func runSaveImages(contextDir string, platforms []v1.Platform, sys *types.SystemContext, opts *saverOptions) error {
	if !opts.enabled {
		logger.Warn("save-image is disabled, skip pulling images")
		return nil
	}
	registryDir := filepath.Join(contextDir, constants.RegistryDirName)
	images, err := buildimage.List(contextDir)
	if err != nil {
		return err
	}
	tars, err := buildimage.TarList(contextDir)
	if err != nil {
		return err
	}
	if len(images) == 0 && len(tars) == 0 {
		return nil
	}
	auths, err := crane.GetAuthInfo(sys)
	if err != nil {
		return err
	}
	is := save.NewImageSaver(getContext(), opts.maxPullProcs, auths)
	isTar := save.NewImageTarSaver(getContext(), opts.maxPullProcs)
	for _, pf := range platforms {
		if len(images) != 0 {
			images, err = is.SaveImages(images, registryDir, pf)
			if err != nil {
				return fmt.Errorf("failed to save images: %w", err)
			}
			logger.Info("saving images %s", strings.Join(images, ", "))
		}
		if len(tars) != 0 {
			tars, err = isTar.SaveImages(tars, registryDir, pf)
			if err != nil {
				return fmt.Errorf("failed to save tar images: %w", err)
			}
			logger.Info("saving tar images %s", strings.Join(tars, ", "))
		}
	}
	return nil
}

func parsePlatforms(c *cobra.Command) ([]v1.Platform, error) {
	parsedPlatforms, err := parse.PlatformsFromOptions(c)
	if err != nil {
		return nil, err
	}
	// flags are not modified, use local platform
	switch len(parsedPlatforms) {
	case 0:
		return []v1.Platform{platforms.DefaultSpec()}, nil
	case 1:
		var platform v1.Platform
		idx0 := parsedPlatforms[0]
		if idx0.OS != "" {
			platform.OS = idx0.OS
		} else {
			platform.OS = runtime.GOOS
		}
		if idx0.Arch != "" {
			platform.Architecture = idx0.Arch
		} else {
			platform.Architecture = runtime.GOARCH
		}
		if idx0.Variant != "" {
			platform.Variant = idx0.Variant
		} else {
			platform.Variant = platforms.DefaultSpec().Variant
		}
		return []v1.Platform{platform}, nil
	}

	var ret []v1.Platform
	for _, pf := range parsedPlatforms {
		ret = append(ret, v1.Platform{Architecture: pf.Arch, OS: pf.OS, Variant: pf.Variant})
	}
	return ret, nil
}
