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
	"github.com/fanux/sealos/install"
	"github.com/spf13/cobra"
)

var contact = `
      ___           ___           ___           ___       ___           ___     
     /\  \         /\  \         /\  \         /\__\     /\  \         /\  \    
    /::\  \       /::\  \       /::\  \       /:/  /    /::\  \       /::\  \   
   /:/\ \  \     /:/\:\  \     /:/\:\  \     /:/  /    /:/\:\  \     /:/\ \  \  
  _\:\~\ \  \   /::\~\:\  \   /::\~\:\  \   /:/  /    /:/  \:\  \   _\:\~\ \  \ 
 /\ \:\ \ \__\ /:/\:\ \:\__\ /:/\:\ \:\__\ /:/__/    /:/__/ \:\__\ /\ \:\ \ \__\
 \:\ \:\ \/__/ \:\~\:\ \/__/ \/__\:\/:/  / \:\  \    \:\  \ /:/  / \:\ \:\ \/__/
  \:\ \:\__\    \:\ \:\__\        \::/  /   \:\  \    \:\  /:/  /   \:\ \:\__\  
   \:\/:/  /     \:\ \/__/        /:/  /     \:\  \    \:\/:/  /     \:\/:/  /  
    \::/  /       \:\__\         /:/  /       \:\__\    \::/  /       \::/  /   
     \/__/         \/__/         \/__/         \/__/     \/__/         \/__/  

                  官方文档：sealyun.com
                  项目地址：github.com/fanux/sealos
                  QQ群   ：98488045
                  常见问题：sealyun.com/faq
`

// initCmd represents the init command
var initCmd = &cobra.Command{
	Use:   "init",
	Short: "Simplest way to init your kubernets HA cluster",
	Long:  `sealos init --master 192.168.0.2 --master 192.168.0.3 --master 192.168.0.4 --node 192.168.0.5 --user root --passwd your-server-password`,
	Run: func(cmd *cobra.Command, args []string) {
		c := &install.SealConfig{}
		install.BuildInit()
		c.Dump("")
		fmt.Println(contact)
	},
}

func init() {
	rootCmd.AddCommand(initCmd)

	// Here you will define your flags and configuration settings.
	initCmd.Flags().StringVar(&install.SSHConfig.User, "user", "root", "servers user name for ssh")
	initCmd.Flags().StringVar(&install.SSHConfig.Password, "passwd", "", "password for ssh")
	initCmd.Flags().StringVar(&install.SSHConfig.PkFile, "pk", "/root/.ssh/id_rsa", "private key for ssh")

	initCmd.Flags().StringVar(&install.KubeadmFile, "kubeadm-config", "", "kubeadm-config.yaml template file")

	initCmd.Flags().StringVar(&install.ApiServer, "apiserver", "apiserver.cluster.local", "apiserver domain name")
	initCmd.Flags().StringVar(&install.VIP, "vip", "10.103.97.2", "virtual ip")
	initCmd.Flags().StringSliceVar(&install.MasterIPs, "master", []string{}, "kubernetes multi-masters ex. 192.168.0.2-192.168.0.4")
	initCmd.Flags().StringSliceVar(&install.NodeIPs, "node", []string{}, "kubernetes multi-nodes ex. 192.168.0.5-192.168.0.5")

	initCmd.Flags().StringVar(&install.PkgUrl, "pkg-url", "", "http://store.lameleg.com/kube1.14.1.tar.gz download offline package url, or file location ex. /root/kube1.14.1.tar.gz")
	initCmd.Flags().StringVar(&install.Version, "version", "v1.14.1", "version is kubernetes version")
	initCmd.Flags().StringVar(&install.Repo, "repo", "k8s.gcr.io", "choose a container registry to pull control plane images from")
	initCmd.Flags().StringVar(&install.PodCIDR, "podcidr", "100.64.0.0/10", "Specify range of IP addresses for the pod network")
	initCmd.Flags().StringVar(&install.SvcCIDR, "svccidr", "10.96.0.0/12", "Use alternative range of IP address for service VIPs")
	initCmd.Flags().StringVar(&install.Interface, "interface", "eth.*|en.*|em.*", "name of network interface")

	initCmd.Flags().BoolVar(&install.WithoutCNI, "without-cni", false, "If true we not install cni plugin")
	initCmd.Flags().StringVar(&install.Network, "network", "calico", "cni plugin, calico..")
	initCmd.Flags().BoolVar(&install.IPIP, "ipip", true, "ipip mode enable, calico..")
	initCmd.Flags().StringVar(&install.MTU, "mtu", "1440", "mtu of the ipip mode , calico..")

	initCmd.Flags().StringVar(&install.LvscareImage.Image, "lvscare-image", "fanux/lvscare", "lvscare image name")
	initCmd.Flags().StringVar(&install.LvscareImage.Tag, "lvscare-tag", "latest", "lvscare image tag name")

	// 不像用户暴露
	// initCmd.Flags().StringVar(&install.CertPath, "cert-path", "/root/.sealos/pki", "cert file path")
	// initCmd.Flags().StringVar(&install.CertEtcdPath, "cert-etcd-path", "/root/.sealos/pki/etcd", "etcd cert file path")
}
