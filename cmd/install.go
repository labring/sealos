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
)

// installCmd represents the install command
var installCmd = &cobra.Command{
	Use:   "install",
	Short: "kubernetes cluster install plugin,ex dashboard",
	Long:  `sealos install --master 172.16.3.254 --user root --passwd admin --name dashboard --pkg-url /root/dashboard.tar.gz`,
	Run: func(cmd *cobra.Command, args []string) {
		install.BuildInstall(name)
	},
}
var name string

func init() {
	rootCmd.AddCommand(installCmd)

	// Here you will define your flags and configuration settings.
	// Here you will define your flags and configuration settings.
	installCmd.Flags().StringVar(&install.User, "user", "root", "servers user name for ssh")
	installCmd.Flags().StringVar(&install.Passwd, "passwd", "", "password for ssh")
	installCmd.Flags().StringVar(&install.PrivateKeyFile, "pk", "/root/.ssh/id_rsa", "private key for ssh")
	installCmd.Flags().BoolVar(&install.Kustomize, "kust", false, "kustomize type deploy")

	installCmd.Flags().StringSliceVar(&install.Masters, "master", []string{}, "kubernetes masters")
	installCmd.Flags().StringSliceVar(&install.Nodes, "node", []string{}, "kubernetes nodes")
	installCmd.Flags().StringVar(&name, "name", "", "kubernetes plugins name")
	installCmd.Flags().StringVar(&install.PkgUrl, "pkg-url", "", "http://store.lameleg.com/prometheus.tar.gz download offline plugins package url, or file localtion ex. /root/prometheus.tar.gz")

}
