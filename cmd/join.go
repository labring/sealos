// Copyright © 2021 sealos.
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
	"os"

	"github.com/fanux/sealos/pkg/utils/iputils"

	"github.com/fanux/sealos/pkg/utils/logger"

	install "github.com/fanux/sealos/pkg/install"
	v1 "github.com/fanux/sealos/pkg/types/v1alpha1"
	"github.com/spf13/cobra"
)

// joinCmd represents the join command
var joinCmd = &cobra.Command{
	Use:   "join",
	Short: "simplest way to join your kubernets HA cluster",
	Long:  `sealos join --node 192.168.0.5`,
	PreRun: func(cmd *cobra.Command, args []string) {
		if len(v1.MasterIPs) == 0 && len(v1.NodeIPs) == 0 {
			logger.Error("this command is join feature,master and node is empty at the same time.please check your args in command.")
			_ = cmd.Help()
			os.Exit(0)
		}
	},
	Run: JoinCmdFunc,
}

func init() {
	rootCmd.AddCommand(joinCmd)
	joinCmd.Flags().StringSliceVar(&v1.MasterIPs, "master", []string{}, "kubernetes multi-master ex. 192.168.0.5-192.168.0.5")
	joinCmd.Flags().StringSliceVar(&v1.NodeIPs, "node", []string{}, "kubernetes multi-nodes ex. 192.168.0.5-192.168.0.5")
	joinCmd.Flags().IntVar(&v1.Vlog, "vlog", 0, "kubeadm log level")
}

func JoinCmdFunc(cmd *cobra.Command, args []string) {
	beforeNodes := iputils.ParseIPs(v1.NodeIPs)
	beforeMasters := iputils.ParseIPs(v1.MasterIPs)

	c := &v1.SealConfig{}
	if err := c.Load(cfgFile); err != nil {
		logger.Error(err)
		c.ShowDefaultConfig()
		os.Exit(0)
	}

	cfgNodes := append(c.Masters, c.Nodes...)
	joinNodes := append(beforeNodes, beforeMasters...)

	if ok, node := deleteOrJoinNodeIsExistInCfgNodes(joinNodes, cfgNodes); ok {
		logger.Error(`[%s] has already exist in your cluster. please check.`, node)
		os.Exit(-1)
	}

	install.BuildJoin(beforeMasters, beforeNodes)
	c.Dump(cfgFile)
}
