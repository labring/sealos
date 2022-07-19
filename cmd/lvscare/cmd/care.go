// Copyright © 2022 sealos.
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
	"github.com/labring/lvscare/care"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/spf13/cobra"
)

// careCmd represents the care command
var careCmd = &cobra.Command{
	Use:   "care",
	Short: "A lightweight LVS baby care, support ipvs health check.",
	RunE: func(cmd *cobra.Command, args []string) error {
		return care.LVS.VsAndRsCare()
	},
	PreRunE: func(cmd *cobra.Command, args []string) error {
		if err := care.SetTargetIP(); err != nil {
			return err
		}
		// if target ip is empty, skip sync router
		if care.LVS.TargetIP == nil {
			return nil
		}
		return care.LVS.SyncRouter()
	},
}

func init() {
	cobra.OnInitialize(func() {
		//TODO: expose showPath flag?
		switch care.LVS.Logger {
		case "INFO":
			logger.CfgConsoleLogger(false, false)
		case "DEBG":
			logger.CfgConsoleLogger(true, false)
		default:
			logger.CfgConsoleLogger(false, false)
		}
	})
	care.LVS.RegisterFlags(careCmd.Flags())
	rootCmd.AddCommand(careCmd)
}
