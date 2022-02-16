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
	"os"
	"strings"

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
