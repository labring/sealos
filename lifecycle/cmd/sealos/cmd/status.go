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
	"fmt"

	"github.com/labring/sealos/pkg/checker"
	"github.com/labring/sealos/pkg/clusterfile"

	"github.com/spf13/cobra"
)

// newStatusCmd
func newStatusCmd() *cobra.Command {
	checkCmd := &cobra.Command{
		Use:   "status",
		Short: "state of sealos",
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			cluster, err := clusterfile.GetClusterFromName(clusterName)
			if err != nil {
				return fmt.Errorf("get default cluster failed, %v", err)
			}
			list := []checker.Interface{checker.NewRegistryChecker(), checker.NewCRIShimChecker(), checker.NewCRICtlChecker(), checker.NewInitSystemChecker(), checker.NewNodeChecker(), checker.NewPodChecker(), checker.NewSvcChecker(), checker.NewClusterChecker()}
			return checker.RunCheckList(list, cluster, checker.PhasePost)
		},
	}
	checkCmd.Flags().StringVarP(&clusterName, "cluster", "c", "default", "name of cluster to applied status action")
	return checkCmd
}
