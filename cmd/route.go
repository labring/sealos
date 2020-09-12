/*
Copyright © 2020 NAME HERE <EMAIL ADDRESS>

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
package cmd

import (
	"github.com/fanux/sealos/install"
	"github.com/spf13/cobra"
)

// routeCmd represents the route command
var routeCmd = &cobra.Command{
	Use:   "route",
	Short: "set default route for host",
	Run:   RouteCmdFunc,
}

var (
	host string
	gatewayIp string
)

func init() {
	rootCmd.AddCommand(routeCmd)
	routeCmd.Flags().StringVar(&host, "host", "", "route host ip address for iFace")
	// manually to set gate for ip
	routeCmd.Flags().StringVar(&gatewayIp, "gateway", "", "default route gateway ip address")
}

func RouteCmdFunc(cmd *cobra.Command, args []string) {
	r := install.GetRouteFlag(host, gatewayIp)
	r.SetRoute()
}
