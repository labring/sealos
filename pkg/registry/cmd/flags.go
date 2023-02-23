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
	"os"
	"runtime"

	"github.com/pkg/errors"

	"github.com/docker/docker/api/types"
	"github.com/spf13/pflag"

	"github.com/labring/sealos/pkg/registry"
	"github.com/labring/sealos/pkg/utils/file"
)

const defaultRegistryName = "sealos.hub:5000"

type imagesResults struct {
	registryName string
	filter       string
	json         bool
}

func (opts *imagesResults) RegisterFlags(fs *pflag.FlagSet) {
	fs.SetInterspersed(false)
	fs.BoolVar(&opts.json, "json", opts.json, "output in JSON format")
	fs.StringVarP(&opts.registryName, "name", "n", defaultRegistryName, "registry name")
	fs.StringVar(&opts.filter, "filter", opts.filter, "Filter support 'name' and 'tag' , strategy support prefix (eg key*),suffix(eg *key),equals(eg key),empty(eg <none>),like(eg *key*)")
}

type imageResults struct {
	registryName string
	image        string
	json         bool
}

func (opts *imageResults) RegisterFlags(fs *pflag.FlagSet) {
	fs.SetInterspersed(false)
	fs.BoolVar(&opts.json, "json", opts.json, "output in JSON format")
	fs.StringVarP(&opts.registryName, "name", "n", defaultRegistryName, "registry name")
	fs.StringVar(&opts.image, "image", opts.image, "image name,ex library/nginx:test")
}

type rmiResults struct {
	registryName string
}

func (opts *rmiResults) RegisterFlags(fs *pflag.FlagSet) {
	fs.SetInterspersed(false)
	fs.StringVarP(&opts.registryName, "name", "n", defaultRegistryName, "registry name")
}

type registryStatusResults struct {
	json bool
}

func (opts *registryStatusResults) RegisterFlags(fs *pflag.FlagSet) {
	fs.SetInterspersed(false)
	fs.BoolVar(&opts.json, "json", opts.json, "output in JSON format")
}

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
	cfg, err := registry.GetAuthInfo()
	if err != nil {
		return nil, errors.Wrap(err, "auth info is error")
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
