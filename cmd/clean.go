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

	"github.com/fanux/sealos/pkg/install"
	v1 "github.com/fanux/sealos/pkg/types/v1alpha1"
	"github.com/spf13/cobra"
)

var exampleCleanCmd = `
	# clean  master
	sealos clean --master 192.168.0.2 \
	--master 192.168.0.3
  
	# clean  node  use --force/-f will be not prompt 
	sealos clean --node 192.168.0.4 \
	--node 192.168.0.5 --force

	# clean master and node
	sealos clean --master 192.168.0.2-192.168.0.3 \
 	--node 192.168.0.4-192.168.0.5
	
	# clean your kubernets HA cluster and use --force/-f will be not prompt (danger)
	sealos clean --all -f
`

// cleanCmd represents the clean command
var cleanCmd = &cobra.Command{
	Use:     "clean",
	Short:   "Simplest way to clean your kubernets HA cluster",
	Long:    `sealos clean`,
	Example: exampleCleanCmd,
	Run:     CleanCmdFunc,
}

func init() {
	rootCmd.AddCommand(cleanCmd)

	// Here you will define your flags and configuration settings.
	cleanCmd.Flags().StringSliceVar(&v1.NodeIPs, "node", []string{}, "clean node ips.kubernetes multi-nodes ex. 192.168.0.5-192.168.0.5")
	cleanCmd.Flags().StringSliceVar(&v1.MasterIPs, "master", []string{}, "clean master ips.kubernetes multi-nodes ex. 192.168.0.5-192.168.0.5")
	cleanCmd.PersistentFlags().BoolVarP(&v1.CleanForce, "force", "f", false, "if this is true, will no prompt")
	cleanCmd.PersistentFlags().BoolVar(&v1.CleanAll, "all", false, "if this is true, delete all ")
	cleanCmd.Flags().IntVar(&v1.Vlog, "vlog", 0, "kubeadm log level")

	// Cobra supports Persistent Flags which will work for this command
	// and all subcommands, e.g.:
	// cleanCmd.PersistentFlags().String("foo", "", "A help for foo")

	// Cobra supports local flags which will only run when this command
	// is called directly, e.g.:
	// cleanCmd.Flags().BoolP("toggle", "t", false, "Help message for toggle")
}

func CleanCmdFunc(cmd *cobra.Command, args []string) {
	deleteNodes := iputils.ParseIPs(v1.NodeIPs)
	deleteMasters := iputils.ParseIPs(v1.MasterIPs)
	c := &v1.SealConfig{}
	if err := c.Load(cfgFile); err != nil {
		logger.Error(err)
		os.Exit(-1)
	}

	// 使用 sealos clean --node   不小心写了 masterip.
	if ok, node := deleteOrJoinNodeIsExistInCfgNodes(deleteNodes, c.Masters); ok {
		logger.Error(`clean master Use "sealos clean --master %s" to clean it, exit...`, node)
		os.Exit(-1)
	}
	// 使用 sealos clean --master 不小心写了 nodeip.
	if ok, node := deleteOrJoinNodeIsExistInCfgNodes(deleteMasters, c.Nodes); ok {
		logger.Error(`clean nodes Use "sealos clean --node %s" to clean it, exit...`, node)
		os.Exit(-1)
	}

	install.BuildClean(deleteNodes, deleteMasters)
	c.Dump(cfgFile)
}

// IsExistNodes
func deleteOrJoinNodeIsExistInCfgNodes(deleteOrJoinNodes []string, nodes []string) (bool, string) {
	for _, node := range nodes {
		for _, deleteOrJoinNode := range deleteOrJoinNodes {
			// 如果ips 相同. 则说明cfg配置文件已经存在该node.
			if node == deleteOrJoinNode {
				return true, node
			}
		}
	}
	return false, ""
}
