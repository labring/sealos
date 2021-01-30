// Copyright © 2019 NAME HERE <EMAIL ADDRESS>
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

	"github.com/fanux/sealos/cert"
	"github.com/fanux/sealos/install"
	"github.com/wonderivan/logger"

	"github.com/spf13/cobra"
)

var (
	cfgFile string
	Info    bool
)

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Use:   "sealos",
	Short: "A brief description of your application",
	Long: `A longer description that spans multiple lines and likely contains
examples and usage of using your application. For example:

Cobra is a CLI library for Go that empowers applications.
This application is a tool to generate the needed files
to quickly create a Cobra application.`,
	// Uncomment the following line if your bare application
	// has an action associated with it:
	//	Run: func(cmd *cobra.Command, args []string) { },
}

// Execute adds all child commands to the root command and sets flags appropriately.
// This is called by main.main(). It only needs to happen once to the rootCmd.
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}

func init() {
	cobra.OnInitialize(initConfig)
	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file (default is $HOME/.sealos/config.yaml)")
	rootCmd.PersistentFlags().BoolVar(&Info, "info", false, "logger ture for Info, false for Debug")

}

// initConfig reads in config file and ENV variables if set.
func initConfig() {
	// Find home directory.
	home := cert.GetUserHomeDir()
	logFile := fmt.Sprintf("%s/.sealos/sealos.log", home)
	if !install.FileExist(home + "/.sealos") {
		err := os.MkdirAll(home+"/.sealos", os.ModePerm)
		if err != nil {
			fmt.Println("create default sealos config dir failed, please create it by your self mkdir -p /root/.sealos && touch /root/.sealos/config.yaml")
		}
	}
	if Info {
		logger.Cfg(5, logFile)
	} else {
		logger.Cfg(6, logFile)
	}
}
