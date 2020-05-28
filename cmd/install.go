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
	"github.com/fanux/sealos/install"
	"github.com/spf13/cobra"
	"github.com/wonderivan/logger"
	"os"
)

var AppURL string

// installCmd represents the install command
var installCmd = &cobra.Command{
	Use:   "install",
	Short: "install kubernetes apps, like dashboard prometheus ..",
	Long:  `sealos install --pkg-url /root/dashboard.tar`,
	Run: func(cmd *cobra.Command, args []string) {
		install.AppInstall(AppURL)
	},
	PreRun: func(cmd *cobra.Command, args []string) {
		if AppURL == "" {
			logger.Error("your pkg-url is empty,please check your command is ok?")
			cmd.Help()
			os.Exit(0)
		}
	},
}
var name string

func init() {
	rootCmd.AddCommand(installCmd)

	installCmd.Flags().StringVar(&AppURL, "pkg-url", "", "http://store.lameleg.com/prometheus.tar.gz download offline plugins package url, or file localtion ex. /root/prometheus.tar.gz")
}
