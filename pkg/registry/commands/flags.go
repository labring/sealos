/*
Copyright 2023 cuisongliu@qq.com.

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
	"fmt"
	"os"
	"runtime"

	"github.com/docker/docker/api/types"
	"github.com/spf13/pflag"

	"github.com/labring/sealos/pkg/registry"
	"github.com/labring/sealos/pkg/utils/file"
)

type registrySaveResults struct {
	registryPullRegistryDir  string
	registryPullArch         string
	registryPullMaxPullProcs int
}

func (opts *registrySaveResults) RegisterFlags(fs *pflag.FlagSet) {
	fs.SetInterspersed(false)
	fs.StringVar(&opts.registryPullArch, "arch", runtime.GOARCH, "pull images arch")
	fs.StringVar(&opts.registryPullRegistryDir, "data-dir", "/var/lib/registry", "registry data dir path")
	fs.IntVar(&opts.registryPullMaxPullProcs, "max-pull-procs", 5, "maximum number of goroutines for pulling")
}

func (opts *registrySaveResults) CheckAuth() (map[string]types.AuthConfig, error) {
	if !file.IsExist(opts.registryPullRegistryDir) {
		_ = os.MkdirAll(opts.registryPullRegistryDir, 0755)
	}
	cfg, err := registry.GetAuthInfo(nil)
	if err != nil {
		return nil, fmt.Errorf("auth info is error: %w", err)
	}
	return cfg, nil
}

type registrySaveRawResults struct {
	*registrySaveResults
	images []string
}

func (opts *registrySaveRawResults) RegisterFlags(fs *pflag.FlagSet) {
	opts.registrySaveResults.RegisterFlags(fs)
	fs.StringSliceVar(&opts.images, "images", []string{}, "images list")
}

type registrySaveDefaultResults struct {
	*registrySaveResults
}

func (opts *registrySaveDefaultResults) RegisterFlags(fs *pflag.FlagSet) {
	opts.registrySaveResults.RegisterFlags(fs)
}
