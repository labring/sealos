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
	"fmt"

	"github.com/fanux/sealos/pkg/cni"
	"github.com/fanux/sealos/pkg/utils/logger"

	"github.com/spf13/cobra"
)

var cniType string
var cniVersion string

// cniCmd represents the cni command
var cniCmd = &cobra.Command{
	Use:   "cni",
	Short: "sealos print cni config",
	Run: func(cmd *cobra.Command, args []string) {
		if cniType != cni.CALICO && cniType != cni.FLANNEL && cniType != cni.CILIUM {
			logger.Error("unsupport cni: ", cniType)
			return
		}
		if cniVersion == "" {
			logger.Error("cni version should not nil ", cniVersion)
			return
		}
		yaml := cni.NewNetwork(cniType, cni.MetaData{
			Interface: "interface=eth.*|en.*|em.*",
			IPIP:      true,
			MTU:       "1440",
			Version:   cniVersion,
		}).Manifests("")
		fmt.Println(yaml)
	},
}

func init() {
	rootCmd.AddCommand(cniCmd)

	cniCmd.Flags().StringVarP(&cniType, "cni-type", "t", cni.CALICO, "print cni yaml, cni tpye just like, calico.flannel.cilium")
	cniCmd.Flags().StringVarP(&cniVersion, "version", "v", "", "calico version")

	// Here you will define your flags and configuration settings.

	// Cobra supports Persistent Flags which will work for this command
	// and all subcommands, e.g.:
	// cniCmd.PersistentFlags().String("foo", "", "A help for foo")

	// Cobra supports local flags which will only run when this command
	// is called directly, e.g.:
	// cniCmd.Flags().BoolP("toggle", "t", false, "Help message for toggle")
}
