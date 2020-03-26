// Copyright © 2019 NAME HERE <EMAIL ADDRESS>
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
	"github.com/fanux/lvscare/care"
	"github.com/spf13/cobra"
)

// careCmd represents the care command
var careCmd = &cobra.Command{
	Use:   "care",
	Short: "A brief description of your command",
	Long: `A longer description that spans multiple lines and likely contains examples
and usage of using your command. For example:

Cobra is a CLI library for Go that empowers applications.
This application is a tool to generate the needed files
to quickly create a Cobra application.`,
	Run: func(cmd *cobra.Command, args []string) {
		care.LVS.VsAndRsCare()
	},
}

func init() {
	rootCmd.AddCommand(careCmd)
	// Here you will define your flags and configuration settings.

	// Cobra supports Persistent Flags which will work for this command
	// and all subcommands, e.g.:
	// careCmd.PersistentFlags().String("foo", "", "A help for foo")
	careCmd.Flags().BoolVar(&care.LVS.RunOnce, "run-once", false, "is run once mode")
	careCmd.Flags().StringVar(&care.LVS.VirtualServer, "vs", "", "virturl server like 10.54.0.2:6443")
	careCmd.Flags().StringSliceVar(&care.LVS.RealServer, "rs", []string{}, "virturl server like 192.168.0.2:6443")

	careCmd.Flags().StringVar(&care.LVS.HealthPath, "health-path", "/healthz", "health check path")
	careCmd.Flags().StringVar(&care.LVS.HealthSchem, "health-schem", "https", "health check schem")
	careCmd.Flags().Int32Var(&care.LVS.Interval, "interval", 5, "health check interval, unit is sec.")
	// Cobra supports local flags which will only run when this command
	// is called directly, e.g.:
	// careCmd.Flags().BoolP("toggle", "t", false, "Help message for toggle")
}
