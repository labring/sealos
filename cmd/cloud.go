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

	"github.com/fanux/sealgate/cloud"
	"github.com/fanux/sealos/install"

	"github.com/spf13/cobra"
)

var p bool

func prompt() {
}

// cloudCmd represents the cloud command
var cloudCmd = &cobra.Command{
	Use:   "cloud",
	Short: "sealos on cloud",
	Long:  `sealos will create vms vpc switch security group on cloud and install kubernetes on it`,
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("install kubernetes on cloud...")
		var key,sec string
		if key = os.Getenv("ACCESS_KEY_ID"); key != "" {
			install.C.AccessKey = key
		}
		if sec = os.Getenv("ACCESS_KEY_SECRET");sec != "" {
			install.C.AccessKey = sec
		}
		install.CloudInstall(&install.C)
	},
}

func init() {
	rootCmd.AddCommand(cloudCmd)
	cloudCmd.Flags().StringVar(&install.C.AccessKey, "accessKey", "", "cloud provider accessKey, like LTAIah2bOOcr0uuT")
	cloudCmd.Flags().StringVar(&install.C.AccessSecret, "accessSecret", "", "cloud provider accessSecret, like FN3FcvXUctbudisnHs89bcYlbsZuImh")
	cloudCmd.Flags().StringVar(&install.C.Provider,"provider", cloud.ALI,  "cloud provider accessSecret, like FN3FcvXUctbudisnHs89bcYlbsZuImh")
	cloudCmd.Flags().IntVar(&install.C.Master, "master", 1, "the number of master vms")
	cloudCmd.Flags().IntVar(&install.C.Node, "node", 1, "the number of node vms")
	cloudCmd.Flags().StringVar(&install.C.Version, "version", "v1.16.0", "kubernetes version")
	cloudCmd.Flags().StringVar(&install.C.Flavor, "flavor", "2C4G", "the type of vms")
	cloudCmd.Flags().StringVar(&install.C.Name, "name", "sealyun" + install.RandString(8), "the name of your cluster")
	cloudCmd.Flags().StringVar(&install.C.Passwd, "passwd", "Fanux#123", "the passwd of your vm servers")
	cloudCmd.Flags().StringVar(&install.C.Region, "region", "cn-hongkong", "cloud provider region")
	cloudCmd.Flags().StringVar(&install.C.Zone, "zone", "cn-hongkong-b", "cloud provider region")
	cloudCmd.Flags().StringVar(&install.C.Image, "image", "centos_7_04_64_20G_alibase_201701015.vhd", "vm os image")
	cloudCmd.Flags().BoolVar(&p, "y", false, "prompt or not")

	// Here you will define your flags and configuration settings.

	// Cobra supports Persistent Flags which will work for this command
	// and all subcommands, e.g.:
	// cloudCmd.PersistentFlags().String("foo", "", "A help for foo")

	// Cobra supports local flags which will only run when this command
	// is called directly, e.g.:
	// cloudCmd.Flags().BoolP("toggle", "t", false, "Help message for toggle")
}
