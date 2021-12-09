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
	"os"
)

var AppURL  string

// installCmd represents the install command
var installCmd = &cobra.Command{
	Use:   "install",
	Short: "install kubernetes apps, like dashboard prometheus ..",
	Long:  `sealos install --pkg-url /root/dashboard.tar  --workdir /data \
-f /root/values.yaml -c /root/config`,
	Run: func(cmd *cobra.Command, args []string) {
		install.AppInstall(AppURL)
	},
	PreRun: func(cmd *cobra.Command, args []string) {
		if install.ExitInstallCase(AppURL)  {
			cmd.Help()
			os.Exit(install.ErrorExitOSCase)
		}
	},
}
var name string

func init() {
	rootCmd.AddCommand(installCmd)

	installCmd.Flags().StringVar(&AppURL, "pkg-url", "", "http://store.lameleg.com/prometheus.tar.gz download offline plugins package url, or file localtion ex. /root/prometheus.tar.gz")
	installCmd.Flags().StringVarP(&install.Workdir, "workdir", "w", "/root/", "workdir for install package home ex.  sealos install --pkg-url dashboard.tar --workdir /data")
	installCmd.Flags().StringVarP(&install.PackageConfig, "pkg-config","c", "", `packageConfig for install package config  ex. sealos install --pkg-url dashboard.tar -c config`)
	installCmd.Flags().StringVarP(&install.Values, "values","f", "", "values for  install package values.yaml , you know what you did .ex. sealos install --pkg-url dashboard.tar -f values.yaml")
}
