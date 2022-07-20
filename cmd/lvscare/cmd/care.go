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
	"github.com/spf13/cobra"

	"github.com/labring/lvscare/care"
	"github.com/labring/sealos/pkg/utils/flags"
	"github.com/labring/sealos/pkg/utils/logger"
)

// careCmd represents the care command
var careCmd = &cobra.Command{
	Use:   "care",
	Short: "A lightweight LVS baby care, support ipvs health check.",
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

func init() {
	cobra.OnInitialize(func() {
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
