/*
Copyright 2022 cuisongliu@qq.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package cmd

import (
	"io/ioutil"
	"os"
	"strings"

	"github.com/fanux/sealos/pkg/utils/file"

	"github.com/fanux/sealos/cmd/sealos/boot"
	"github.com/fanux/sealos/pkg/cri"
	"github.com/fanux/sealos/pkg/kubeadm"
	"github.com/fanux/sealos/pkg/token"
	"github.com/fanux/sealos/pkg/types/contants"
	"github.com/fanux/sealos/pkg/utils/logger"
	"github.com/spf13/cobra"
	"sigs.k8s.io/yaml"
)

func init() {
	rootCmd.AddCommand(NewConfigCmd())
}

func NewConfigCmd() *cobra.Command {
	var cmd = &cobra.Command{
		Use:   "config",
		Short: "config manager",
		//Run: func(cmd *cobra.Command, args []string) {
		//
		//},
	}
	cmd.AddCommand(NewKubeadmConfigCmd())
	cmd.AddCommand(NewPatchConfigCmd())
	return cmd
}

func NewKubeadmConfigCmd() *cobra.Command {
	var cmd = &cobra.Command{
		Use:   "kubeadm",
		Short: "config manager kubeadm",
		//Run: func(cmd *cobra.Command, args []string) {
		//
		//},
	}
	cmd.AddCommand(NewKubeadmConfigInitCmd())
	cmd.AddCommand(NewKubeadmConfigJoinCmd())
	return cmd
}

func NewKubeadmConfigInitCmd() *cobra.Command {
	var cmd = &cobra.Command{
		Use:   "init",
		Short: "config manager kubeadm init",
		//Run: func(cmd *cobra.Command, args []string) {
		//
		//},
	}
	cmd.AddCommand(NewKubeadmConfigInitTemplatesCmd())
	cmd.AddCommand(NewKubeadmConfigInitGeneratorCmd())
	return cmd
}

func NewKubeadmConfigJoinCmd() *cobra.Command {
	var cmd = &cobra.Command{
		Use:   "join",
		Short: "config manager kubeadm join",
		//Run: func(cmd *cobra.Command, args []string) {
		//
		//},
	}
	cmd.AddCommand(NewKubeadmConfigJoinTemplatesCmd())
	cmd.AddCommand(NewKubeadmConfigJoinNodeGeneratorCmd())
	cmd.AddCommand(NewKubeadmConfigJoinMasterGeneratorCmd())
	return cmd
}

func NewKubeadmConfigInitTemplatesCmd() *cobra.Command {
	var cmd = &cobra.Command{
		Use:   "print-templates",
		Short: "config manager kubeadm init print-templates",
		Run: func(cmd *cobra.Command, args []string) {
			i := kubeadm.NewInit(boot.CmdFlag.Config.KubeVersion, "1.2.3.4", cri.DefaultContainerdCRISocket)
			ic := i.DefaultTemplate()
			c := kubeadm.NewCluster(boot.CmdFlag.Config.KubeVersion, contants.DefaultAPIServerDomain, contants.DefaultPodCIDR, contants.DefaultSvcCIDR, contants.DefaultVIP, []string{"1.2.3.4"}, []string{})
			cc := c.DefaultTemplate()
			kp := kubeadm.NewKubeproxy(contants.DefaultVIP)
			kpc := kp.DefaultTemplate()
			kl := kubeadm.NewKubelet()
			klc := kl.DefaultTemplate()
			data := strings.Join([]string{ic, cc, kpc, klc}, "\n---")
			println(data)
		},
	}
	return cmd
}
func NewKubeadmConfigInitGeneratorCmd() *cobra.Command {
	var kubeVersion, apiserverDomain, master0, vip, podCIDR, svcCIDR, criSocket, patchPath, patch string
	var masters, sans []string
	var cmd = &cobra.Command{
		Use:   "generator",
		Short: "config manager kubeadm init generator",
		PreRun: func(cmd *cobra.Command, args []string) {
			if err := kubeadm.ValidateKubeVersionForKubeadm(kubeVersion); err != nil {
				logger.Error(err.Error())
				os.Exit(1)
			}
			if file.IsExist(patchPath) {
				data, err := ioutil.ReadFile(patchPath)
				if err != nil {
					logger.Error(err.Error())
					os.Exit(1)
				}
				patch = string(data)
			}
		},
		Run: func(cmd *cobra.Command, args []string) {
			data, err := kubeadm.GetterInitKubeadmConfig(kubeVersion, master0, apiserverDomain, podCIDR, svcCIDR, vip, cri.DefaultContainerdCRISocket, patch, masters, sans)
			if err != nil {
				logger.Error("generator kubeadm init-config  error: %s", err.Error())
				os.Exit(1)
			}
			println(data)
		},
	}
	cmd.Flags().StringVar(&patchPath, "patch-path", "", "patch file path,use patch config")
	cmd.Flags().StringVar(&master0, "master0", "", "kubernetes master0 value")
	cmd.Flags().StringVar(&apiserverDomain, "apiserver-domain", contants.DefaultAPIServerDomain, "apiserver domain name")
	cmd.Flags().StringVar(&vip, "vip", "10.103.97.2", "virtual ip")
	cmd.Flags().StringSliceVar(&masters, "master", []string{}, "kubernetes multi-masters ex. 192.168.0.2-192.168.0.4")
	cmd.Flags().StringSliceVar(&sans, "cert-sans", []string{}, "kubernetes apiServerCertSANs ex. 47.0.0.22 sealyun.com ")
	cmd.Flags().StringVar(&kubeVersion, "kube-version", "", "version is kubernetes version")
	cmd.Flags().StringVar(&podCIDR, "pod-cidr", contants.DefaultPodCIDR, "Specify range of IP addresses for the pod network")
	cmd.Flags().StringVar(&svcCIDR, "svc-cidr", contants.DefaultSvcCIDR, "Use alternative range of IP address for service VIPs")
	cmd.Flags().StringVar(&criSocket, "cri-socket", cri.DefaultContainerdCRISocket, "default container runtime socket")

	return cmd
}

func NewKubeadmConfigJoinTemplatesCmd() *cobra.Command {
	var cmd = &cobra.Command{
		Use:   "print-templates",
		Short: "config manager kubeadm join print-templates",
		Run: func(cmd *cobra.Command, args []string) {
			nj := kubeadm.NewJoinNode(boot.CmdFlag.Config.KubeVersion, cri.DefaultContainerdCRISocket, contants.DefaultVIP, token.Token{})
			njc := nj.DefaultTemplate()
			kl := kubeadm.NewKubelet()
			klc := kl.DefaultTemplate()
			data := strings.Join([]string{njc, klc}, "\n---")
			println(data)
		},
	}
	return cmd
}
func NewKubeadmConfigJoinNodeGeneratorCmd() *cobra.Command {
	var kubeVersion, vip, criSocket, patchPath, patch string
	var t token.Token
	var cmd = &cobra.Command{
		Use:   "generator-node",
		Short: "config manager kubeadm join generator master",
		PreRun: func(cmd *cobra.Command, args []string) {
			if err := kubeadm.ValidateKubeVersionForKubeadm(kubeVersion); err != nil {
				logger.Error(err.Error())
				os.Exit(1)
			}
			if file.IsExist(patchPath) {
				data, err := ioutil.ReadFile(patchPath)
				if err != nil {
					logger.Error(err.Error())
					os.Exit(1)
				}
				patch = string(data)
			}
		},
		Run: func(cmd *cobra.Command, args []string) {
			data, err := kubeadm.GetterJoinNodeKubeadmConfig(kubeVersion, vip, criSocket, patch, t)
			if err != nil {
				logger.Error("generator kubeadm join-config  error: %s", err.Error())
				os.Exit(1)
			}
			println(data)
		},
	}
	cmd.Flags().StringVar(&patchPath, "patch-path", "", "patch file path,use patch config")
	cmd.Flags().StringVar(&vip, "vip", "10.103.97.2", "virtual ip")
	cmd.Flags().StringVar(&kubeVersion, "kube-version", "", "version is kubernetes version")
	cmd.Flags().StringVar(&criSocket, "cri-socket", cri.DefaultContainerdCRISocket, "default container runtime socket")
	cmd.Flags().StringVar(&t.JoinToken, "token", "", "default join token")
	cmd.Flags().StringVar(&t.CertificateKey, "certificate-key", "", "default join certificateKey")
	cmd.Flags().StringSliceVar(&t.DiscoveryTokenCaCertHash, "discovery-token-ca-cert-hash", []string{}, "default join discoveryTokenCaCertHash")

	return cmd
}
func NewKubeadmConfigJoinMasterGeneratorCmd() *cobra.Command {
	var kubeVersion, master0, masterIP, vip, criSocket, patchPath, patch string
	var t token.Token
	var cmd = &cobra.Command{
		Use:   "generator-master",
		Short: "config manager kubeadm join generator master",
		PreRun: func(cmd *cobra.Command, args []string) {
			if err := kubeadm.ValidateKubeVersionForKubeadm(kubeVersion); err != nil {
				logger.Error(err.Error())
				os.Exit(1)
			}
			if file.IsExist(patchPath) {
				data, err := ioutil.ReadFile(patchPath)
				if err != nil {
					logger.Error(err.Error())
					os.Exit(1)
				}
				patch = string(data)
			}
		},
		Run: func(cmd *cobra.Command, args []string) {
			data, err := kubeadm.GetterJoinMasterKubeadmConfig(kubeVersion, master0, masterIP, criSocket, patch, t)
			if err != nil {
				logger.Error("generator kubeadm join-config  error: %s", err.Error())
				os.Exit(1)
			}
			println(data)
		},
	}
	cmd.Flags().StringVar(&patchPath, "patch-path", "", "patch file path,use patch config")
	cmd.Flags().StringVar(&master0, "master0", "", "kubernetes master0 value")
	cmd.Flags().StringVar(&masterIP, "master-ip", "", "kubernetes join masterIP value")

	cmd.Flags().StringVar(&vip, "vip", "10.103.97.2", "virtual ip")
	cmd.Flags().StringVar(&kubeVersion, "kube-version", "", "version is kubernetes version")
	cmd.Flags().StringVar(&criSocket, "cri-socket", cri.DefaultContainerdCRISocket, "default container runtime socket")
	cmd.Flags().StringVar(&t.JoinToken, "token", "", "default join token")
	cmd.Flags().StringVar(&t.CertificateKey, "certificate-key", "", "default join certificateKey")
	cmd.Flags().StringSliceVar(&t.DiscoveryTokenCaCertHash, "discovery-token-ca-cert-hash", []string{}, "default join discoveryTokenCaCertHash")

	return cmd
}

func NewPatchConfigCmd() *cobra.Command {
	var cmd = &cobra.Command{
		Use:   "patch",
		Short: "config manager patch",
		//Run: func(cmd *cobra.Command, args []string) {
		//
		//},
	}
	cmd.AddCommand(NewPatchConfigInitDefaultsCmd())
	cmd.AddCommand(NewPatchConfigJoinDefaultsCmd())
	return cmd
}

func NewPatchConfigInitDefaultsCmd() *cobra.Command {
	var cmd = &cobra.Command{
		Use:   "init-defaults",
		Short: "Print default init patch configuration, that can be used for 'sealos init', Format documented at https://datatracker.ietf.org/doc/html/rfc6902",
		Run: func(cmd *cobra.Command, args []string) {
			data, err := yaml.Marshal(kubeadm.DefaultInitPatch())
			if err != nil {
				logger.Error("print patch init-defaults error: %s", err.Error())
				os.Exit(1)
			}
			println(string(data))
		},
	}
	return cmd
}

func NewPatchConfigJoinDefaultsCmd() *cobra.Command {
	var cmd = &cobra.Command{
		Use:   "join-defaults",
		Short: "Print default join patch configuration, that can be used for 'sealos join', Format documented at https://datatracker.ietf.org/doc/html/rfc6902",
		Run: func(cmd *cobra.Command, args []string) {
			data, err := yaml.Marshal(kubeadm.DefaultJoinPatch())
			if err != nil {
				logger.Error("print patch join-defaults error: %s", err.Error())
				os.Exit(1)
			}
			println(string(data))
		},
	}
	return cmd
}
