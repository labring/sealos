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
	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/apply"
	"github.com/labring/sealos/pkg/utils/logger"
)

var clusterFile string

func newApplyCmd() *cobra.Command {
	applyArgs := &apply.Args{}
	// applyCmd represents the apply command
	var applyCmd = &cobra.Command{
		Use:     "apply",
		Short:   "Run cloud images within a kubernetes cluster with Clusterfile",
		Example: `sealos apply -f Clusterfile`,
		Args:    cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			applier, err := apply.NewApplierFromFile(cmd, clusterFile, applyArgs)
			if err != nil {
				return err
			}
			return applier.Apply()
		},
		PostRun: func(cmd *cobra.Command, args []string) {
			logger.Info(getContact())
		},
	}
	setRequireBuildahAnnotation(applyCmd)
	applyCmd.Flags().StringVarP(&clusterFile, "Clusterfile", "f", "Clusterfile", "apply a kubernetes cluster")
	applyArgs.RegisterFlags(applyCmd.Flags())
	return applyCmd
}
