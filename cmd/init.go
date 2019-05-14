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

var (
	masters []string
	nodes   []string
	vip     string
	pkgURL  string
)

// initCmd represents the init command
var initCmd = &cobra.Command{
	Use:   "init",
	Short: "Simplest way to init your kubernets HA cluster",
	Long:  `sealos init --master 192.168.0.2 --master 192.168.0.3 --master 192.168.0.4 --node 192.168.0.5 --user root --passwd your-server-password`,
	Run: func(cmd *cobra.Command, args []string) {
		//master hosts and ports
		mh, mp := install.HostAndPortSpilt(masters)
		//nodes hosts and ports
		nh, np := install.HostAndPortSpilt(nodes)
		i := install.BuildInstaller(mh, mp, nh, np, vip)
		i.SendPackage(pkgURL)
		i.KubeadmConfigInstall()
		i.InstallMaster0()
		i.JoinMasters()
		i.JoinNodes()
	},
}

func init() {
	rootCmd.AddCommand(initCmd)

	// Here you will define your flags and configuration settings.
	initCmd.Flags().StringVar(&install.User, "user", "root", "servers user name for ssh")
	initCmd.Flags().StringVar(&install.Passwd, "passwd", "passwd", "password for ssh")
	initCmd.Flags().StringVar(&install.KubeadmFile, "kubeadm-config", "", "kubeadm-config.yaml local")

	initCmd.Flags().StringVar(&vip, "vip", "10.103.97.2", "virtual ip")
	initCmd.Flags().StringSliceVar(&masters, "master", []string{}, "kubernetes masters")
	initCmd.Flags().StringSliceVar(&nodes, "node", []string{}, "kubernetes nodes")

	initCmd.Flags().StringVar(&pkgURL, "pkg-url", "", "http://store.lameleg.com/kube1.14.1.tar.gz download offline pakage url, or file localtion ex. /root/kube1.14.1.tar.gz")
	initCmd.Flags().StringVar(&install.Version, "version", "v1.14.1", "version is kubernetes version")
}
