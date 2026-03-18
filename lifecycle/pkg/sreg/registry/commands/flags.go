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
	"github.com/docker/docker/api/types/registry"
	"github.com/labring/sealos/pkg/sreg/registry/crane"
	"os"
	"runtime"

	"github.com/spf13/pflag"

	"github.com/labring/sealos/pkg/sreg/utils/file"
)

type registrySaveResults struct {
	registryPullRegistryDir  string
	registryPullArch         string
	registryPullMaxPullProcs int
}

func (opts *registrySaveResults) RegisterFlags(fs *pflag.FlagSet) {
	fs.SetInterspersed(false)
	fs.StringVar(&opts.registryPullArch, "arch", runtime.GOARCH, "pull images arch")
	fs.StringVar(&opts.registryPullRegistryDir, "registry-dir", "registry", "registry data dir path")
	fs.IntVar(&opts.registryPullMaxPullProcs, "max-pull-procs", 5, "maximum number of goroutines for pulling")
}

func (opts *registrySaveResults) CheckAuth() (map[string]registry.AuthConfig, error) {
	if !file.IsExist(opts.registryPullRegistryDir) {
		_ = os.MkdirAll(opts.registryPullRegistryDir, 0755)
	}
	cfg, err := crane.GetAuthInfo(nil)
	if err != nil {
		return nil, fmt.Errorf("auth info is error: %w", err)
	}
	return cfg, nil
}

type registrySaveRawResults struct {
	*registrySaveResults
	images []string
	tars   []string
	all    bool
}

func (opts *registrySaveRawResults) RegisterFlags(fs *pflag.FlagSet) {
	opts.registrySaveResults.RegisterFlags(fs)
	fs.StringSliceVar(&opts.images, "images", []string{}, "images list")
	fs.StringSliceVar(&opts.tars, "tars", []string{}, "tar list, eg: --tars=docker-archive:/root/config_main.tar@library/config_main")
	fs.BoolVar(&opts.all, "all", false, "Pull all images if SOURCE-IMAGE is a list")
}
