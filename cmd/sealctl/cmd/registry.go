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
	"runtime"

	"github.com/labring/sealos/pkg/registry/cmd"

	"github.com/spf13/cobra"
)

var (
	registryPullRegistryDir  string
	registryPullArch         string
	registryPullMaxPullProcs int
)

func newRegistryImageCmd() *cobra.Command {
	var registryImageCmd = &cobra.Command{
		Use:   "registry",
		Short: "registry images manager",
	}
	registryImageCmd.AddCommand(newRegistryImagePullCmd())
	return registryImageCmd
}

func newRegistryImagePullCmd() *cobra.Command {
	var registryImagePullCmd = &cobra.Command{
		Use:   "pull",
		Short: "registry images manager pull to local dir",
	}
	registryImagePullCmd.PersistentFlags().StringVar(&registryPullArch, "arch", runtime.GOARCH, "pull images arch")
	registryImagePullCmd.PersistentFlags().StringVar(&registryPullRegistryDir, "data-dir", "/var/lib/registry", "registry data dir path")
	registryImagePullCmd.PersistentFlags().IntVar(&registryPullMaxPullProcs, "max-pull-procs", 5, "maximum number of goroutines for pulling")
	registryImagePullCmd.AddCommand(cmd.NewPullCmd(registryPullRegistryDir, registryPullArch, registryPullMaxPullProcs, "default"))
	registryImagePullCmd.AddCommand(cmd.NewPullCmd(registryPullRegistryDir, registryPullArch, registryPullMaxPullProcs, "raw"))
	return registryImagePullCmd
}

func init() {
	rootCmd.AddCommand(newRegistryImageCmd())
}
