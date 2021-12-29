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
	v1 "github.com/fanux/sealos/pkg/types/v1alpha1"
	"github.com/spf13/cobra"
)

// ipvsCmd represents the ipvs command
var ipvsCmd = &cobra.Command{
	Use:   "ipvs",
	Short: "sealos create or care local ipvs lb",
	Run: func(cmd *cobra.Command, args []string) {
		v1.Ipvs.VsAndRsCare()
	},
}

func init() {
	rootCmd.AddCommand(ipvsCmd)

	// Here you will define your flags and configuration settings.
	ipvsCmd.Flags().BoolVar(&v1.Ipvs.RunOnce, "run-once", false, "is run once mode")
	ipvsCmd.Flags().BoolVarP(&v1.Ipvs.Clean, "clean", "c", true, " clean Vip ipvs rule before join node, if Vip has no ipvs rule do nothing.")
	ipvsCmd.Flags().StringVar(&v1.Ipvs.VirtualServer, "vs", "", "virturl server like 10.54.0.2:6443")
	ipvsCmd.Flags().StringSliceVar(&v1.Ipvs.RealServer, "rs", []string{}, "virturl server like 192.168.0.2:6443")

	ipvsCmd.Flags().StringVar(&v1.Ipvs.HealthPath, "health-path", "/healthz", "health check path")
	ipvsCmd.Flags().StringVar(&v1.Ipvs.HealthSchem, "health-schem", "https", "health check schem")
	ipvsCmd.Flags().Int32Var(&v1.Ipvs.Interval, "interval", 5, "health check interval, unit is sec.")
	// Cobra supports Persistent Flags which will work for this command
	// and all subcommands, e.g.:
	// ipvsCmd.PersistentFlags().String("foo", "", "A help for foo")

	// Cobra supports local flags which will only run when this command
	// is called directly, e.g.:
	// ipvsCmd.Flags().BoolP("toggle", "t", false, "Help message for toggle")
}
