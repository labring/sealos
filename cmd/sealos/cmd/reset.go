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
	"github.com/labring/sealos/pkg/apply"
	"github.com/labring/sealos/pkg/apply/processor"
	"github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/spf13/cobra"
)

var exampleReset = `
reset you current cluster:
	sealos reset --name xxx [--force]
`

var resetArgs *apply.ResetArgs

func newResetCmd() *cobra.Command {
	var resetCmd = &cobra.Command{
		Use:     "reset",
		Short:   "Simplest way to reset your cluster",
		Long:    `sealos reset --name [arg]`,
		Example: exampleReset,
		Args:    cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := processor.ConfirmDeleteNodes(); err != nil {
				return err
			}
			applier, err := apply.NewApplierFromResetArgs(resetArgs)
			if err != nil {
				return err
			}
			return applier.Delete()
		},
		PostRun: func(cmd *cobra.Command, args []string) {
			logger.Info(contact)
		},
	}
	return resetCmd
}

func init() {
	resetArgs = &apply.ResetArgs{}
	resetCmd := newResetCmd()
	rootCmd.AddCommand(resetCmd)
	resetCmd.Flags().StringVarP(&resetArgs.Masters, "masters", "m", "", "set Count or IPList to masters")
	resetCmd.Flags().StringVarP(&resetArgs.Nodes, "nodes", "n", "", "set Count or IPList to nodes")
	resetCmd.Flags().StringVarP(&resetArgs.User, "user", "u", v1beta1.DefaultUserRoot, "set baremetal server username")
	resetCmd.Flags().StringVarP(&resetArgs.Password, "passwd", "p", "", "set cloud provider or baremetal server password")
	resetCmd.Flags().Uint16Var(&resetArgs.Port, "port", 22, "set the sshd service port number for the server")
	resetCmd.Flags().StringVar(&resetArgs.Pk, "pk", v1beta1.DefaultPKFile, "set baremetal server private key")
	resetCmd.Flags().StringVar(&resetArgs.PkPassword, "pk-passwd", "", "set baremetal server private key password")
	resetCmd.Flags().StringVar(&resetArgs.ClusterName, "name", "default", "set cluster name variables")
	resetCmd.Flags().BoolVar(&processor.ForceDelete, "force", false, "we also can input an --force flag to reset cluster by force")
}
