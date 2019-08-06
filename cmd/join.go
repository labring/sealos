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

// joinCmd represents the join command
var joinCmd = &cobra.Command{
	Use:   "join",
	Short: "Simplest way to join your kubernets HA cluster",
	Long:  `sealos join --master 192.168.0.2 --master 192.168.0.3 --master 192.168.0.4 --node 192.168.0.5 --vip 192.168.0.1  --user root --passwd your-server-password --pkg-url /root/kube1.14.1.tar.gz`,
	Run: func(cmd *cobra.Command, args []string) {
		install.BuildJoin(masters, nodes, vip, pkgURL)
	},
}

func init() {
	rootCmd.AddCommand(joinCmd)
	joinCmd.Flags().StringVar(&install.User, "user", "root", "servers user name for ssh")
	joinCmd.Flags().StringVar(&install.Passwd, "passwd", "passwd", "password for ssh")
	joinCmd.Flags().StringVar(&vip, "vip", "10.103.97.2", "virtual ip")
	joinCmd.Flags().StringSliceVar(&masters, "master", []string{}, "kubernetes masters")
	joinCmd.Flags().StringSliceVar(&nodes, "node", []string{}, "kubernetes nodes")

	joinCmd.Flags().StringVar(&pkgURL, "pkg-url", "", "http://store.lameleg.com/kube1.14.1.tar.gz download offline pakage url, or file localtion ex. /root/kube1.14.1.tar.gz")
}
