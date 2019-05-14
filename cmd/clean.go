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

// cleanCmd represents the clean command
var cleanCmd = &cobra.Command{
	Use:   "clean",
	Short: "Simplest way to clean your kubernets HA cluster",
	Long:  `sealos clean --master 192.168.0.2 --master 192.168.0.3 --master 192.168.0.4 --node 192.168.0.5 --user root --passwd your-server-password`,
	Run: func(cmd *cobra.Command, args []string) {
		//master hosts and ports
		mh, mp := install.HostAndPortSpilt(masters)
		//nodes hosts and ports
		nh, np := install.HostAndPortSpilt(nodes)
		i := install.BuildInstaller(mh, mp, nh, np, "")
		i.CleanCluster()
	},
}

func init() {
	rootCmd.AddCommand(cleanCmd)

	// Here you will define your flags and configuration settings.

	// Cobra supports Persistent Flags which will work for this command
	// and all subcommands, e.g.:
	// cleanCmd.PersistentFlags().String("foo", "", "A help for foo")

	// Cobra supports local flags which will only run when this command
	// is called directly, e.g.:
	// cleanCmd.Flags().BoolP("toggle", "t", false, "Help message for toggle")

	cleanCmd.Flags().StringVar(&install.User, "user", "root", "servers user name for ssh")
	cleanCmd.Flags().StringVar(&install.Passwd, "passwd", "passwd", "password for ssh")

	cleanCmd.Flags().StringSliceVar(&masters, "master", []string{}, "kubernetes masters")
	cleanCmd.Flags().StringSliceVar(&nodes, "node", []string{}, "kubernetes nodes")
}
