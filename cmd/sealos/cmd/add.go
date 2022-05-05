// Copyright © 2022 cuisongliu@qq.com.
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
	"errors"

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/labring/sealos/pkg/apply"
	"github.com/spf13/cobra"
)

// addCmd represents the delete command
func newAddCmd() *cobra.Command {
	var deleteCmd = &cobra.Command{
		Use:   "add",
		Short: "add some node",
		Args:  cobra.NoArgs,
		Example: `
add to default cluster: 
	sealos add --masters x.x.x.x --nodes x.x.x.x
	sealos add --masters x.x.x.x-x.x.x.y --nodes x.x.x.x-x.x.x.y
`,
		RunE: func(cmd *cobra.Command, args []string) error {
			//return errors.New("add feature no support")
			applier, err := apply.NewScaleApplierFromArgs(addArgs, "add")
			if err != nil {
				return err
			}
			return applier.Apply()
		},
		PreRunE: func(cmd *cobra.Command, args []string) error {
			if addArgs.Nodes == "" && addArgs.Masters == "" {
				return errors.New("node and master not empty in same time")
			}
			return nil
		},
		PostRun: func(cmd *cobra.Command, args []string) {
			logger.Info(contact)
		},
	}
	addArgs = &apply.ScaleArgs{}
	deleteCmd.Flags().StringVarP(&addArgs.Masters, "masters", "m", "", "reduce Count or IPList to masters")
	deleteCmd.Flags().StringVarP(&addArgs.Nodes, "nodes", "n", "", "reduce Count or IPList to nodes")
	deleteCmd.Flags().StringVarP(&addArgs.ClusterName, "cluster", "c", "default", "delete a kubernetes cluster with cluster name")
	return deleteCmd
}

var addArgs *apply.ScaleArgs

func init() {
	rootCmd.AddCommand(newAddCmd())
}
