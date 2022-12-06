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
	"path"
	"strings"

	"github.com/containers/buildah/pkg/parse"
	v1 "github.com/opencontainers/image-spec/specs-go/v1"
	"github.com/pkg/errors"
	"github.com/spf13/cobra"
	"github.com/spf13/pflag"

	"github.com/labring/sealos/pkg/buildimage"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/registry"
	"github.com/labring/sealos/pkg/utils/logger"
)

type saveOptions struct {
	maxPullProcs int
	enabled      bool
}

func (opts *saveOptions) RegisterFlags(fs *pflag.FlagSet) {
	fs.IntVar(&opts.maxPullProcs, "max-pull-procs", 5, "maximum number of goroutines for pulling")
	fs.BoolVar(&opts.enabled, "save-image", true, "save images parsed to local")
}

func runSaveImages(contextDir string, platforms []v1.Platform, opts *saveOptions) error {
	if !opts.enabled {
		logger.Warn("save-image is disabled, skip pulling images")
		return nil
	}
	images, err := buildimage.List(contextDir)
	if err != nil {
		return err
	}
	if len(images) == 0 {
		return nil
	}
	auths, err := registry.GetAuthInfo()
	if err != nil {
		return err
	}
	is := registry.NewImageSaver(getContext(), opts.maxPullProcs, auths)
	for _, pf := range platforms {
		logger.Debug("pull images %v for platform %s", images, strings.Join([]string{pf.OS, pf.Architecture}, "/"))
		images, err = is.SaveImages(images, path.Join(contextDir, constants.RegistryDirName), pf)
		if err != nil {
			return errors.Wrap(err, "failed to save images")
		}
		logger.Info("saving images %s", strings.Join(images, ", "))
	}
	return nil
}

func parsePlatforms(c *cobra.Command) ([]v1.Platform, error) {
	platforms, err := parse.PlatformsFromOptions(c)
	if err != nil {
		return nil, err
	}
	var ret []v1.Platform
	for _, pf := range platforms {
		ret = append(ret, v1.Platform{Architecture: pf.Arch, OS: pf.OS, Variant: pf.Variant})
	}
	return ret, nil
}
