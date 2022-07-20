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
	"github.com/spf13/cobra"

	"github.com/labring/lvscare/care"
	"github.com/labring/sealos/pkg/utils/flags"
)

func newIPVSCmd() *cobra.Command {
	var ipvsCmd = &cobra.Command{
		Use:   "ipvs",
		Short: "sealos create or care local ipvs lb",
		RunE: func(cmd *cobra.Command, args []string) error {
			return care.LVS.VsAndRsCare()
		},
		PreRunE: func(cmd *cobra.Command, args []string) error {
			flags.PrintFlags(cmd.Flags())
			if err := care.LVS.ValidateAndSetDefaults(); err != nil {
				return err
			}
			if !care.LVS.Clean {
				return care.LVS.SyncRouter()
			}
			return nil
		},
	}
	care.LVS.RegisterFlags(ipvsCmd.Flags())
	return ipvsCmd
}

func init() {
	rootCmd.AddCommand(newIPVSCmd())
}
