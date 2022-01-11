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

	"github.com/fanux/sealos/install"
)

var (
	host      string
	gatewayIP string
)

func NewRouteCmd() *cobra.Command {
	// routeCmd represents the route command
	var cmd = &cobra.Command{
		Use:   "route",
		Short: "set default route gateway",
		Run:   RouteCmdFunc,
	}
	// check route for host
	cmd.Flags().StringVar(&host, "host", "", "route host ip address for iFace")
	cmd.AddCommand(NewDelRouteCmd())
	cmd.AddCommand(NewAddRouteCmd())
	return cmd
}

func init() {
	rootCmd.AddCommand(NewRouteCmd())
}

func NewAddRouteCmd() *cobra.Command {
	var cmd = &cobra.Command{
		Use:   "add",
		Short: "set route host via gateway",
		Run:   RouteAddCmdFunc,
	}
	// manually to set host via gateway
	cmd.Flags().StringVar(&host, "host", "", "route host ,ex ip route add host via gateway")
	cmd.Flags().StringVar(&gatewayIP, "gateway", "", "route gateway ,ex ip route add host via gateway")
	return cmd
}

func NewDelRouteCmd() *cobra.Command {
	var cmd = &cobra.Command{
		Use:   "del",
		Short: "del route host via gateway, like ip route del host via gateway",
		Run:   RouteDelCmdFunc,
	}
	// manually to set host via gateway
	cmd.Flags().StringVar(&host, "host", "", "route host ,ex ip route del host via gateway")
	cmd.Flags().StringVar(&gatewayIP, "gateway", "", "route gateway ,ex ip route del host via gateway")
	return cmd
}

func RouteCmdFunc(cmd *cobra.Command, args []string) {
	r := install.GetRouteFlag(host, gatewayIP)
	r.CheckRoute()
}

func RouteAddCmdFunc(cmd *cobra.Command, args []string) {
	r := install.GetRouteFlag(host, gatewayIP)
	r.SetRoute()
}

func RouteDelCmdFunc(cmd *cobra.Command, args []string) {
	r := install.GetRouteFlag(host, gatewayIP)
	r.DelRoute()
}
