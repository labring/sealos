// Copyright © 2021 Alibaba Group Holding Ltd.
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

	"github.com/labring/sealos/pkg/apply/processor"

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/labring/sealos/pkg/apply"
	"github.com/spf13/cobra"
)

// deleteCmd represents the delete command
func newDeleteCmd() *cobra.Command {
	var deleteCmd = &cobra.Command{
		Use:   "delete",
		Short: "delete some node",
		Args:  cobra.NoArgs,
		Example: `
delete to default cluster: 
	sealos delete --masters x.x.x.x --nodes x.x.x.x
	sealos delete --masters x.x.x.x-x.x.x.y --nodes x.x.x.x-x.x.x.y
`,
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := processor.ConfirmDeleteNodes(); err != nil {
				return err
			}
			applier, err := apply.NewScaleApplierFromArgs(deleteArgs, "delete")
			if err != nil {
				return err
			}
			return applier.Apply()
		},
		PreRunE: func(cmd *cobra.Command, args []string) error {
			if deleteArgs.Nodes == "" && deleteArgs.Masters == "" {
				return errors.New("node and master not empty in same time")
			}
			return nil
		},
		PostRun: func(cmd *cobra.Command, args []string) {
			logger.Info(contact)
		},
	}
	deleteArgs = &apply.ScaleArgs{}
	deleteCmd.Flags().StringVarP(&deleteArgs.Masters, "masters", "m", "", "reduce Count or IPList to masters")
	deleteCmd.Flags().StringVarP(&deleteArgs.Nodes, "nodes", "n", "", "reduce Count or IPList to nodes")
	deleteCmd.Flags().StringVarP(&deleteArgs.ClusterName, "cluster", "c", "default", "delete a kubernetes cluster with cluster name")
	deleteCmd.Flags().BoolVar(&processor.ForceDelete, "force", false, "We also can input an --force flag to delete cluster by force")
	return deleteCmd
}

var deleteArgs *apply.ScaleArgs

func init() {
	rootCmd.AddCommand(newDeleteCmd())
}
