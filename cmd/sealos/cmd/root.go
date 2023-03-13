// Copyright © 2021 sealos.
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

package cmd

import (
	"fmt"
	"os"

	"github.com/labring/sealos/pkg/system"

	"github.com/labring/sealos/pkg/buildah"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/spf13/cobra"
)

var (
	debug bool
)

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Use:   "sealos",
	Short: "sealos is a Kubernetes distribution, a unified OS to manage cloud native applications.",
	// Uncomment the following line if your bare application
	// has an action associated with it:
	//	Run: func(cmd *cobra.Command, args []string) { },
}

// Execute adds all child commands to the root command and sets flags appropriately.
// This is called by main.main(). It only needs to happen once to the rootCmd.
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		if rootCmd.SilenceErrors {
			fmt.Println(err)
		}
		os.Exit(1)
	}
}

func init() {
	cobra.OnInitialize(onBootOnDie)
	fs := rootCmd.PersistentFlags()
	fs.BoolVar(&debug, "debug", false, "enable debug logger")
	// add unrelated command names that don't required buildah sdk.
	buildah.AddUnrelatedCommandNames("cert", "status", "docs", "exec", "scp", "version")
}

func onBootOnDie() {
	var config string
	var err error
	if config, err = system.Get(system.DataRootConfigKey); err != nil {
		logger.Error(err)
		os.Exit(1)
		return
	}
	constants.DefaultClusterRootFsDir = config
	if config, err = system.Get(system.RuntimeRootConfigKey); err != nil {
		logger.Error(err)
		os.Exit(1)
		return
	}
	constants.DefaultRuntimeRootDir = config
	var rootDirs = []string{
		constants.LogPath(),
		constants.Workdir(),
	}
	if err = file.MkDirs(rootDirs...); err != nil {
		logger.Error(err)
		os.Exit(1)
		return
	}
	logger.CfgConsoleAndFileLogger(debug, constants.LogPath(), "sealos", false)
}
