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

	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/apply"
	"github.com/labring/sealos/pkg/utils/logger"
)

const exampleAdd = `
add to nodes :
	sealos add --nodes x.x.x.x

add to default cluster:
	sealos add --masters x.x.x.x --nodes x.x.x.x
	sealos add --masters x.x.x.x-x.x.x.y --nodes x.x.x.x-x.x.x.y
`

// addCmd represents the delete command
func newAddCmd() *cobra.Command {
	addArgs := &apply.ScaleArgs{
		Cluster: &apply.Cluster{},
	}
	var addCmd = &cobra.Command{
		Use:     "add",
		Short:   "Add nodes into cluster",
		Args:    cobra.NoArgs,
		Example: exampleAdd,
		RunE: func(cmd *cobra.Command, args []string) error {
			applier, err := apply.NewScaleApplierFromArgs(addArgs, "add")
			if err != nil {
				return err
			}
			return applier.Apply()
		},
		PreRunE: func(cmd *cobra.Command, args []string) error {
			if addArgs.Nodes == "" && addArgs.Masters == "" {
				return errors.New("nodes and masters can't both be empty")
			}
			return nil
		},
		PersistentPostRun: func(cmd *cobra.Command, args []string) {
			logger.Info(getContact())
		},
	}
	addArgs.RegisterFlags(addCmd.Flags(), "be joined", "join")
	return addCmd
}

func init() {
	rootCmd.AddCommand(newAddCmd())
}
