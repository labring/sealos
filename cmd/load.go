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

var name string

// loadCmd represents the load command
var loadCmd = &cobra.Command{
	Use:   "load",
	Short: "kubernetes cluster load plugin,ex dashboard",
	Long:  ``,
	Run: func(cmd *cobra.Command, args []string) {
		install.BuildLoad(masters, nodes, pkgURL, name)
	},
}

func init() {
	rootCmd.AddCommand(loadCmd)

	// Here you will define your flags and configuration settings.
	loadCmd.Flags().StringVar(&install.User, "user", "root", "servers user name for ssh")
	loadCmd.Flags().StringVar(&install.Passwd, "passwd", "", "password for ssh")
	loadCmd.Flags().StringVar(&install.PrivateKeyFile, "pk", "/root/.ssh/id_rsa", "private key for ssh")
	loadCmd.Flags().BoolVar(&install.Kustomize, "kust", true, "kustomize type deploy")

	loadCmd.Flags().StringSliceVar(&masters, "master", []string{}, "kubernetes masters")
	loadCmd.Flags().StringSliceVar(&nodes, "node", []string{}, "kubernetes nodes")
	loadCmd.Flags().StringVar(&name, "name", "", "kubernetes plugins name")
	loadCmd.Flags().StringVar(&pkgURL, "pkg-url", "", "http://store.lameleg.com/prometheus.tar.gz download offline plugins package url, or file localtion ex. /root/prometheus.tar.gz")
}
