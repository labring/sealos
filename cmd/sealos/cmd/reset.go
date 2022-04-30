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

	"github.com/labring/sealos/pkg/runtime"
	"github.com/labring/sealos/pkg/utils/contants"

	"github.com/labring/sealos/pkg/apply"
	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/spf13/cobra"
)

var exampleReset = `
reset you current cluster:
	sealos reset --name xxx [--force]
`

var resetClusterName string

func newResetCmd() *cobra.Command {
	var initCmd = &cobra.Command{
		Use:     "reset",
		Short:   "Simplest way to reset your cluster",
		Long:    `sealos reset --name [arg]`,
		Example: exampleReset,
		Args:    cobra.NoArgs,
		Run: func(cmd *cobra.Command, args []string) {
			filePath := contants.Clusterfile(resetClusterName)
			applier, err := apply.NewApplierFromFile(filePath)
			if err != nil {
				logger.Error(err)
				_ = cmd.Help()
				os.Exit(1)
			}
			if err = applier.Delete(); err != nil {
				logger.Error(err)
				_ = cmd.Help()
				os.Exit(1)
			}
		},
	}
	return initCmd
}

func init() {
	resetCmd := newResetCmd()
	rootCmd.AddCommand(resetCmd)
	resetCmd.Flags().StringVarP(&resetClusterName, "cluster", "c", "default", "reset kubernetes cluster with cluster name")
	resetCmd.Flags().BoolVar(&runtime.ForceDelete, "force", false, "we also can input an --force flag to reset cluster by force")
}
