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
	"github.com/labring/lvscare/care"
	"github.com/spf13/cobra"

	"github.com/labring/sealos/pkg/utils/flags"
)

var Ipvs care.LvsCare

func newIPVSCmd() *cobra.Command {
	var ipvsCmd = &cobra.Command{
		Use:   "ipvs",
		Short: "sealos create or care local ipvs lb",
		Run: func(cmd *cobra.Command, args []string) {
			flags.PrintFlags(cmd.Flags())
			Ipvs.VsAndRsCare()
		},
	}
	ipvsCmd.Flags().BoolVar(&Ipvs.RunOnce, "run-once", false, "is run once mode")
	ipvsCmd.Flags().BoolVarP(&Ipvs.Clean, "clean", "c", true, " clean Vip ipvs rule before join node, if Vip has no ipvs rule do nothing.")
	ipvsCmd.Flags().StringVar(&Ipvs.VirtualServer, "vs", "", "virturl server like 10.54.0.2:6443")
	ipvsCmd.Flags().StringSliceVar(&Ipvs.RealServer, "rs", []string{}, "virturl server like 192.168.0.2:6443")

	ipvsCmd.Flags().StringVar(&Ipvs.HealthPath, "health-path", "/healthz", "health check path")
	ipvsCmd.Flags().StringVar(&Ipvs.HealthSchem, "health-schem", "https", "health check schem")
	ipvsCmd.Flags().Int32Var(&Ipvs.Interval, "interval", 5, "health check interval, unit is sec.")
	return ipvsCmd
}

func init() {
	rootCmd.AddCommand(newIPVSCmd())
}
