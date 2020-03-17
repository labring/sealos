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

// cleanCmd represents the clean command
var cleanCmd = &cobra.Command{
	Use:   "clean",
	Short: "Simplest way to clean your kubernets HA cluster",
	Long:  `sealos clean`,
	Run: func(cmd *cobra.Command, args []string) {
		if !install.CleanForce { // flase
			result := install.Confirm(`clean command will clean all masters and nodes, continue clean (y/n)?`)
			if !result { os.Exit(0) }
		}
		deleteNodes := install.ParseIPs(install.NodeIPs)
		deleteMasters := install.ParseIPs(install.MasterIPs)
		c := &install.SealConfig{}
		c.Load("")
		install.BuildClean(deleteNodes, deleteMasters)
		c.Dump("")
	},
}

func init() {
	rootCmd.AddCommand(cleanCmd)

	// Here you will define your flags and configuration settings.
	cleanCmd.Flags().StringSliceVar(&install.NodeIPs, "node", []string{}, "clean node ips.kubernetes multi-nodes ex. 192.168.0.5-192.168.0.5")
	cleanCmd.Flags().StringSliceVar(&install.MasterIPs, "master", []string{}, "clean master ips.kubernetes multi-nodes ex. 192.168.0.5-192.168.0.5")
	cleanCmd.PersistentFlags().BoolVarP(&install.CleanForce, "force","f", false, "if this is true, will no prompt")
	// Cobra supports Persistent Flags which will work for this command
	// and all subcommands, e.g.:
	// cleanCmd.PersistentFlags().String("foo", "", "A help for foo")

	// Cobra supports local flags which will only run when this command
	// is called directly, e.g.:
	// cleanCmd.Flags().BoolP("toggle", "t", false, "Help message for toggle")
}
