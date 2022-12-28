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

import "github.com/spf13/pflag"

type imagesResults struct {
	registryName string
	filter       string
}

func (opts *imagesResults) RegisterFlags(fs *pflag.FlagSet) {
	fs.SetInterspersed(false)
	fs.StringVarP(&opts.registryName, "name", "n", opts.registryName, "registry name")
	fs.StringVar(&opts.filter, "filter", opts.registryName, "registry filter")
}

type rmiResults struct {
	registryName string
}

func (opts *rmiResults) RegisterFlags(fs *pflag.FlagSet) {
	fs.SetInterspersed(false)
	fs.StringVarP(&opts.registryName, "name", "n", opts.registryName, "registry name")
}
