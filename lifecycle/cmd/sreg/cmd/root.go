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

	"github.com/sirupsen/logrus"
	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/sreg/registry/commands"
	"github.com/labring/sealos/pkg/sreg/utils/logger"
)

var (
	debug bool
)

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Use:   "sreg",
	Short: "sealos registry related",
	// Uncomment the following line if your bare application
	// has an action associated with it:
	//	Run: func(cmd *cobra.Command, args []string) { },
}

// Execute adds all child commands to the root command and sets flags appropriately.
// This is called by main.main(). It only needs to happen once to the rootCmd.
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		if rootCmd.SilenceErrors {
			fmt.Fprintln(os.Stderr, err)
		}
		os.Exit(1)
	}
}

func init() {
	cobra.OnInitialize(func() {
		logger.CfgConsoleLogger(debug, false)
		if debug {
			logrus.SetLevel(logrus.DebugLevel)
		}
	})
	rootCmd.PersistentFlags().BoolVar(&debug, "debug", false, "enable debug logger")

}

func init() {
	examplePrefix := rootCmd.Name()
	rootCmd.AddCommand(commands.NewServeRegistryCommand())
	rootCmd.AddCommand(commands.NewRegistryImageSaveCmd(examplePrefix))
	rootCmd.AddCommand(commands.NewSyncRegistryCommand(examplePrefix))
	rootCmd.AddCommand(commands.NewCopyRegistryCommand(examplePrefix))
}
