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
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/containerd/containerd/platforms"
	"github.com/containers/buildah/pkg/parse"
	"github.com/containers/image/v5/types"
	"github.com/containers/storage/pkg/archive"
	v1 "github.com/opencontainers/image-spec/specs-go/v1"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"

	"github.com/labring/sealos/pkg/buildimage"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/registry"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/flags"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/rand"
)

type saveOptions struct {
	maxPullProcs int
	enabled      bool
	compression  flags.Compression
}

func (opts *saveOptions) RegisterFlags(fs *pflag.FlagSet) {
	fs.IntVar(&opts.maxPullProcs, "max-pull-procs", 5, "maximum number of goroutines for pulling")
	fs.BoolVar(&opts.enabled, "save-image", true, "store images that parsed from the specific directories")
	fs.Var(&opts.compression, "compression", "compression algorithm, which effect the images stored in the registry dir")
}

func runSaveImages(contextDir string, platforms []v1.Platform, sys *types.SystemContext, opts *saveOptions) error {
	if !opts.enabled {
		logger.Warn("save-image is disabled, skip pulling images")
		return nil
	}
	registryDir := filepath.Join(contextDir, constants.RegistryDirName)
	compress := func() error {
		path := filepath.Join(registryDir, "docker")
		if file.IsExist(path) && opts.compression != flags.Disable {
			compression := opts.compression.Compression()
			target := filepath.Join(registryDir, "compressed",
				"compressed-"+rand.Generator(8)+"."+compression.Extension())
			logger.Debug("trying to compress dir %s into archive %s", path, target)
			if err := file.MkDirs(filepath.Dir(target)); err != nil {
				return err
			}
			fp, err := os.Create(target)
			if err != nil {
				return err
			}
			defer fp.Close()
			rc, err := archive.Tar(path, compression)
			if err != nil {
				return err
			}
			defer rc.Close()
			if _, err = io.Copy(fp, rc); err != nil {
				return err
			}
			return os.RemoveAll(path)
		}
		return nil
	}
	images, err := buildimage.List(contextDir)
	if err != nil {
		return err
	}
	if len(images) == 0 {
		return compress()
	}
	auths, err := registry.GetAuthInfo(sys)
	if err != nil {
		return err
	}
	is := registry.NewImageSaver(getContext(), opts.maxPullProcs, auths)

	for _, pf := range platforms {
		logger.Debug("pull images %v for platform %s", images, strings.Join([]string{pf.OS, pf.Architecture}, "/"))
		images, err = is.SaveImages(images, registryDir, pf)
		if err != nil {
			return fmt.Errorf("failed to save images: %w", err)
		}
		logger.Info("saving images %s", strings.Join(images, ", "))
	}
	return compress()
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
